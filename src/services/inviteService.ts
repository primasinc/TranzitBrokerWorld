import { InviteData, DriverInviteForm } from '../types/user';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

export const inviteService = {
  // Send driver invitation
  async sendDriverInvite(inviteData: DriverInviteForm, companyName: string, companyRep: string, inviterId: string): Promise<{ success: boolean; inviteLink?: string; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/auth/invite-driver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: inviteData.name,
          phone: inviteData.phone,
          email: inviteData.email,
          companyName,
          companyRep,
          inviterId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invitation');
      }

      const data = await response.json();
      console.log('Invite created successfully:', data);
      return { success: true, inviteLink: data.inviteLink };
    } catch (error: any) {
      console.error('Error sending driver invite:', error);
      return { success: false, error: error.message || 'Failed to send invitation' };
    }
  },

  // Fetch invite data by token
  async getInviteData(token: string): Promise<InviteData | null> {
    try {
      const response = await fetch(`${API_URL}/auth/invite/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch invite data');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching invite data:', error);
      return null;
    }
  },

  // Mark invite as used
  async markInviteAsUsed(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/auth/invite/${token}/use`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark invite as used');
      }

      return true;
    } catch (error: any) {
      console.error('Error marking invite as used:', error);
      return false;
    }
  }
}; 