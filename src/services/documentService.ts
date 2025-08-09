import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  listAll,
  StorageReference 
} from 'firebase/storage';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  deleteDoc,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { storage, db } from '../config/firebase';

export interface CarrierDocument {
  id?: string;
  name: string;
  type: 'BOL' | 'Insurance' | 'License' | 'Invoice' | 'POD' | 'Other';
  status: 'Valid' | 'Expired' | 'Pending' | 'Rejected';
  dateUploaded: string;
  expiryDate?: string;
  size: string;
  loadId?: string;
  userId: string;
  url?: string;
  storagePath?: string;
  category: 'compliance' | 'loads' | 'general';
  description?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface DocumentUploadData {
  file: File;
  type: CarrierDocument['type'];
  category: CarrierDocument['category'];
  loadId?: string;
  description?: string;
  expiryDate?: string;
}

const DOCUMENTS_COLLECTION = 'carrierDocuments';

export const documentService = {
  // Upload a document to Firebase Storage and create a record in Firestore
  async uploadDocument(
    userId: string, 
    uploadData: DocumentUploadData
  ): Promise<CarrierDocument> {
    try {
      const { file, type, category, loadId, description, expiryDate } = uploadData;
      
      // Validate file size (15MB limit)
      if (file.size > 15 * 1024 * 1024) {
        throw new Error('File size exceeds 15MB limit');
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('File type not supported. Please upload PDF, image, or Word documents.');
      }

      // Create storage path based on category and user
      const storagePath = `carrier-documents/${userId}/${category}/${file.name}`;
      const storageRef = ref(storage, storagePath);

      // Upload file to Firebase Storage with metadata
      const uploadResult = await uploadBytes(storageRef, file, {
        customMetadata: {
          uploaderId: userId,
          category: category,
          documentType: type
        }
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Create document record in Firestore
      const documentData: Omit<CarrierDocument, 'id'> = {
        name: file.name,
        type,
        status: 'Valid',
        dateUploaded: new Date().toISOString(),
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        userId,
        url: downloadURL,
        storagePath,
        category,
        description,
        expiryDate,
        ...(loadId && { loadId }) // Only include loadId if it's provided
      };

      const docRef = await addDoc(collection(db, DOCUMENTS_COLLECTION), {
        ...documentData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      return {
        id: docRef.id,
        ...documentData
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  // Get all documents for a user
  async getUserDocuments(userId: string): Promise<CarrierDocument[]> {
    try {
      const q = query(
        collection(db, DOCUMENTS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const documents: CarrierDocument[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        documents.push({
          id: doc.id,
          ...data
        } as CarrierDocument);
      });
      
      return documents;
    } catch (error) {
      console.error('Error fetching user documents:', error);
      // If it's an index building error, return empty array for now
      if (error instanceof Error && error.message.includes('index')) {
        console.log('Index is still building, returning empty array');
        return [];
      }
      throw error;
    }
  },

  // Get documents by category
  async getDocumentsByCategory(userId: string, category: CarrierDocument['category']): Promise<CarrierDocument[]> {
    try {
      const q = query(
        collection(db, DOCUMENTS_COLLECTION),
        where('userId', '==', userId),
        where('category', '==', category),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const documents: CarrierDocument[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        documents.push({
          id: doc.id,
          ...data
        } as CarrierDocument);
      });
      
      return documents;
    } catch (error) {
      console.error('Error fetching documents by category:', error);
      // If it's an index building error, return empty array for now
      if (error instanceof Error && error.message.includes('index')) {
        console.log('Index is still building, returning empty array');
        return [];
      }
      throw error;
    }
  },

  // Get document by ID
  async getDocumentById(documentId: string): Promise<CarrierDocument | null> {
    try {
      const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data
        } as CarrierDocument;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  },

  // Download document
  async downloadDocument(documentId: string): Promise<{ url: string; name: string }> {
    try {
      const document = await this.getDocumentById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      if (!document.url) {
        throw new Error('Document URL not available');
      }

      return {
        url: document.url,
        name: document.name
      };
    } catch (error) {
      console.error('Error downloading document:', error);
      throw error;
    }
  },

  // Delete document
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      const document = await this.getDocumentById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Verify user owns the document
      if (document.userId !== userId) {
        throw new Error('Unauthorized to delete this document');
      }

      // Delete from Firebase Storage if storage path exists
      if (document.storagePath) {
        const storageRef = ref(storage, document.storagePath);
        await deleteObject(storageRef);
      }

      // Delete from Firestore
      const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  // Update document
  async updateDocument(documentId: string, updates: Partial<CarrierDocument>, userId: string): Promise<CarrierDocument> {
    try {
      const document = await this.getDocumentById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Verify user owns the document
      if (document.userId !== userId) {
        throw new Error('Unauthorized to update this document');
      }

      const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });

      return await this.getDocumentById(documentId) as CarrierDocument;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  // Get document statistics
  async getDocumentStats(userId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const documents = await this.getUserDocuments(userId);
      
      const stats = {
        total: documents.length,
        byCategory: {} as Record<string, number>,
        byStatus: {} as Record<string, number>
      };

      documents.forEach(doc => {
        // Count by category
        stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1;
        
        // Count by status
        stats.byStatus[doc.status] = (stats.byStatus[doc.status] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting document stats:', error);
      throw error;
    }
  }
};
