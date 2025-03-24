import React from 'react';
import { Control, Controller, FieldErrors, useFieldArray } from 'react-hook-form';
import { CarrierProfile, Equipment } from '../../../types/carrier';
import styles from '../CarrierProfileForm.module.css';

interface EquipmentSectionProps {
  control: Control<CarrierProfile>;
  errors: FieldErrors<CarrierProfile>;
}

const equipmentTypes = [
  { value: 'dry_van', label: 'Dry Van' },
  { value: 'reefer', label: 'Reefer' },
  { value: 'flatbed', label: 'Flatbed' },
  { value: 'step_deck', label: 'Step Deck' },
  { value: 'box_truck', label: 'Box Truck' }
];

export const EquipmentSection: React.FC<EquipmentSectionProps> = ({ control, errors }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'equipment'
  });

  const handleAddEquipment = () => {
    append({
      type: 'dry_van',
      count: 1,
      capacity: 0,
      dimensions: {
        length: 53,
        width: 102,
        height: 110
      }
    });
  };

  return (
    <div className={styles.section}>
      <h2>Equipment</h2>
      <div className={styles.equipmentList}>
        {fields.map((field, index) => (
          <div key={field.id} className={styles.equipmentItem}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Equipment Type</label>
              <Controller
                name={`equipment.${index}.type`}
                control={control}
                render={({ field }) => (
                  <select {...field} className={styles.select}>
                    {equipmentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Number of Units</label>
              <Controller
                name={`equipment.${index}.count`}
                control={control}
                rules={{ min: 1 }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="1"
                    className={styles.input}
                  />
                )}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Capacity (lbs)</label>
              <Controller
                name={`equipment.${index}.capacity`}
                control={control}
                rules={{ min: 0 }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    className={styles.input}
                  />
                )}
              />
            </div>

            <div className={styles.dimensions}>
              <h4>Dimensions</h4>
              <div className={styles.dimensionFields}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Length (ft)</label>
                  <Controller
                    name={`equipment.${index}.dimensions.length`}
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        min="0"
                        className={styles.input}
                      />
                    )}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Width (in)</label>
                  <Controller
                    name={`equipment.${index}.dimensions.width`}
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        min="0"
                        className={styles.input}
                      />
                    )}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Height (in)</label>
                  <Controller
                    name={`equipment.${index}.dimensions.height`}
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        min="0"
                        className={styles.input}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              className={styles.removeButton}
            >
              Remove Equipment
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddEquipment}
        className={styles.addButton}
      >
        Add Equipment
      </button>
    </div>
  );
}; 