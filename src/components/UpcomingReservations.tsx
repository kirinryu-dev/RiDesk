import React from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock } from 'lucide-react';

const reservations = [
  {
    id: 1,
    type: 'Desk',
    location: 'Desk A12 - Floor 3',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24), // tomorrow
    time: '9:00 AM - 5:00 PM',
  },
  {
    id: 2,
    type: 'Meeting Room',
    location: 'Conference Room B - Floor 2',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // day after tomorrow
    time: '10:00 AM - 12:00 PM',
  },
  {
    id: 3,
    type: 'Desk',
    location: 'Desk C8 - Floor 1',
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
    time: '9:00 AM - 5:00 PM',
  },
];

const UpcomingReservations: React.FC = () => {
  return (
    <div className="flow-root">
      <ul className="divide-y divide-gray-200">
        {reservations.map((reservation) => (
          <li key={reservation.id} className="py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {reservation.type}
                </p>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  <p>{reservation.location}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {format(reservation.date, 'EEE, MMM d')}
                </p>
                <div className="flex items-center justify-end text-sm text-gray-500 mt-1">
                  <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  <p>{reservation.time}</p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <button
          type="button"
          className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          View All Reservations
        </button>
      </div>
    </div>
  );
};

export default UpcomingReservations;