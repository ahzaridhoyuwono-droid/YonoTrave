
import React from 'react';
import { DailyItinerary, Activity } from '../types';

interface ItineraryCardProps {
  dayPlan: DailyItinerary;
  onActualCostChange: (day: number, activityIndex: number, cost: number | null) => void;
}

interface ActivityItemProps {
  activity: Activity;
  day: number;
  activityIndex: number;
  onActualCostChange: (day: number, activityIndex: number, cost: number | null) => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, day, activityIndex, onActualCostChange }) => (
  <div className="mb-4 p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
    <h4 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
      {activity.name}
      <span className="text-blue-500 text-base" title="Data real-time diverifikasi">🌐</span>
    </h4>
    <p className="text-gray-600 text-sm mb-2">{activity.description}</p>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
      <p className="text-gray-700 text-sm">
        <span className="font-medium">Estimasi Biaya:</span> {activity.estimatedCost}
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor={`actual-cost-${day}-${activityIndex}`} className="text-gray-700 text-sm font-medium sr-only">Biaya Aktual untuk {activity.name}:</label>
        <input
          type="number"
          id={`actual-cost-${day}-${activityIndex}`}
          placeholder="Biaya Aktual"
          className="w-32 p-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          value={activity.actualCost !== null ? activity.actualCost : ''}
          onChange={(e) => {
            const value = e.target.value;
            onActualCostChange(day, activityIndex, value === '' ? null : parseFloat(value));
          }}
          aria-label={`Masukkan biaya aktual untuk ${activity.name}`}
        />
      </div>
    </div>
    {activity.checkPriceLink && (
      <button
        onClick={() => alert(`Simulating navigation to check price for: ${activity.checkPriceLink}`)}
        className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Cek Harga: {activity.checkPriceLink}
      </button>
    )}
  </div>
);

const ItineraryCard: React.FC<ItineraryCardProps> = ({ dayPlan, onActualCostChange }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 w-full max-w-2xl mx-auto border-t-4 border-blue-600">
      <h3 className="text-2xl font-bold text-blue-800 mb-4 pb-2 border-b-2 border-blue-200">
        Day {dayPlan.day}: {dayPlan.date}
      </h3>
      <div className="space-y-4">
        {dayPlan.activities.length > 0 ? (
          dayPlan.activities.map((activity, idx) => (
            <ActivityItem
              key={idx}
              activity={activity}
              day={dayPlan.day}
              activityIndex={idx}
              onActualCostChange={onActualCostChange}
            />
          ))
        ) : (
          <p className="text-gray-500 italic">Tidak ada aktivitas terencana untuk hari ini.</p>
        )}
      </div>
    </div>
  );
};

export default ItineraryCard;
