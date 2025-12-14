
import React, { useState } from 'react';
import { generateTravelItinerary } from './services/geminiService';
import { DailyItinerary, GroundingChunk } from './types';
import ItineraryCard from './components/ItineraryCard';
import LoadingSpinner from './components/LoadingSpinner';

// Helper function to parse currency string into a number
const parseCurrencyToNumber = (currencyString: string): number => {
  if (!currencyString) return 0;
  // Remove currency symbols, non-numeric characters except comma/period for decimals
  const cleanedString = currencyString.replace(/[^0-9.,]/g, '');
  // Replace comma with period for decimal parsing if needed (e.g., European format)
  const standardizedString = cleanedString.replace(/,/g, '.');
  const value = parseFloat(standardizedString);
  return isNaN(value) ? 0 : value;
};

const App: React.FC = () => {
  const [destination, setDestination] = useState<string>('');
  const [duration, setDuration] = useState<number>(3);
  const [interests, setInterests] = useState<string>('');
  const [totalBudget, setTotalBudget] = useState<number | null>(null); // New state for total budget
  const [itinerary, setItinerary] = useState<DailyItinerary[] | null>(null);
  const [groundingUrls, setGroundingUrls] = useState<GroundingChunk[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !duration || !interests) {
      setError('Harap lengkapi semua bidang input wajib.');
      return;
    }

    setLoading(true);
    setError(null);
    setItinerary(null);
    setGroundingUrls([]);

    try {
      const { itinerary: generatedItinerary, urls } = await generateTravelItinerary(
        destination,
        duration,
        interests,
      );
      // Initialize actualCost for each activity
      const initializedItinerary = generatedItinerary.map(dayPlan => ({
        ...dayPlan,
        activities: dayPlan.activities.map(activity => ({
          ...activity,
          actualCost: null, // Initialize actualCost to null
        }))
      }));
      setItinerary(initializedItinerary);
      setGroundingUrls(urls);
    } catch (err: unknown) {
      console.error(err);
      setError(`Gagal membuat rencana perjalanan: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleActualCostChange = (day: number, activityIndex: number, cost: number | null) => {
    if (itinerary) {
      setItinerary(prevItinerary => {
        if (!prevItinerary) return prevItinerary;

        return prevItinerary.map(dayPlan => {
          if (dayPlan.day === day) {
            const updatedActivities = dayPlan.activities.map((activity, idx) => {
              if (idx === activityIndex) {
                return { ...activity, actualCost: cost };
              }
              return activity;
            });
            return { ...dayPlan, activities: updatedActivities };
          }
          return dayPlan;
        });
      });
    }
  };

  const renderGroundingUrls = (urls: GroundingChunk[]) => {
    if (urls.length === 0) return null;

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 w-full max-w-2xl mx-auto border-t-4 border-yellow-500">
        <h3 className="text-xl font-bold text-yellow-800 mb-4 pb-2 border-b-2 border-yellow-200">
          Sumber Informasi Tambahan:
        </h3>
        <ul className="list-disc pl-5 space-y-2">
          {urls.map((chunk, index) => {
            if (chunk.web) {
              return (
                <li key={`web-${index}`}>
                  <a
                    href={chunk.web.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
                  >
                    {chunk.web.title || chunk.web.uri}
                  </a>
                </li>
              );
            } else if (chunk.maps) {
              const reviewUris = chunk.maps.placeAnswerSources?.reviewSnippets?.map(
                (rs) => rs.uri,
              ) || [];
              const allMapsUris = [chunk.maps.uri, ...reviewUris];

              return allMapsUris.map((uri, mapIdx) => (
                <li key={`map-${index}-${mapIdx}`}>
                  <a
                    href={uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200"
                  >
                    {chunk.maps?.title || uri} (Peta)
                  </a>
                </li>
              ));
            }
            return null;
          })}
        </ul>
      </div>
    );
  };

  const renderBudgetSummary = () => {
    if (!itinerary || itinerary.length === 0) return null;

    let totalEstimatedCost = 0;
    let totalActualCost = 0;

    itinerary.forEach(dayPlan => {
      dayPlan.activities.forEach(activity => {
        totalEstimatedCost += parseCurrencyToNumber(activity.estimatedCost);
        if (activity.actualCost !== null) {
          totalActualCost += activity.actualCost;
        }
      });
    });

    const remainingBudget = totalBudget !== null ? totalBudget - totalActualCost : null;
    const averageDailyRemainingBudget =
      remainingBudget !== null && duration > 0 ? remainingBudget / duration : null;

    const formatCurrency = (amount: number) => {
      // Assuming IDR for now, can be made dynamic
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 w-full max-w-2xl mx-auto border-t-4 border-green-600">
        <h3 className="text-2xl font-bold text-green-800 mb-4 pb-2 border-b-2 border-green-200">
          Ringkasan Anggaran
        </h3>
        <div className="space-y-3 text-lg text-gray-800">
          <p>
            <span className="font-medium">Total Estimasi Biaya Seluruh Perjalanan:</span>{' '}
            <span className="font-bold text-blue-700">{formatCurrency(totalEstimatedCost)}</span>
          </p>
          <p>
            <span className="font-medium">Total Biaya Aktual Saat Ini:</span>{' '}
            <span className="font-bold text-purple-700">{formatCurrency(totalActualCost)}</span>
          </p>
          {totalBudget !== null && (
            <>
              <p>
                <span className="font-medium">Total Budget Anda:</span>{' '}
                <span className="font-bold text-green-700">{formatCurrency(totalBudget)}</span>
              </p>
              <p>
                <span className="font-medium">Sisa Budget:</span>{' '}
                <span className={`font-bold ${remainingBudget < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {formatCurrency(remainingBudget)}
                </span>
              </p>
              {duration > 0 && (
                <p>
                  <span className="font-medium">Sisa Budget Harian Rata-rata yang Direkomendasikan:</span>{' '}
                  <span className={`font-bold ${averageDailyRemainingBudget < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {averageDailyRemainingBudget !== null ? formatCurrency(averageDailyRemainingBudget) : 'N/A'}
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-blue-700 leading-tight mb-2">
          AI Travel Planner
        </h1>
        <p className="text-xl text-gray-600">Rencanakan petualangan Anda dengan AI!</p>
      </header>

      <main className="max-w-4xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 sm:p-8 rounded-xl shadow-lg mb-8 space-y-6 border-t-4 border-blue-500"
        >
          <div>
            <label htmlFor="destination" className="block text-gray-800 text-lg font-medium mb-2">
              Tujuan Wisata:
            </label>
            <input
              type="text"
              id="destination"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              placeholder="Misalnya: Bali, Tokyo, Paris"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="duration" className="block text-gray-800 text-lg font-medium mb-2">
              Durasi (Hari):
            </label>
            <input
              type="number"
              id="duration"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              min="1"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              required
            />
          </div>

          <div>
            <label htmlFor="interests" className="block text-gray-800 text-lg font-medium mb-2">
              Minat Khusus:
            </label>
            <textarea
              id="interests"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 h-28 resize-y"
              placeholder="Misalnya: Petualangan, kuliner lokal, sejarah, santai di pantai, belanja"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              required
            ></textarea>
          </div>

          <div>
            <label htmlFor="totalBudget" className="block text-gray-800 text-lg font-medium mb-2">
              Total Budget Anda (Opsional):
            </label>
            <input
              type="number"
              id="totalBudget"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              placeholder="Misalnya: 5000000 (IDR 5 juta)"
              min="0"
              value={totalBudget !== null ? totalBudget : ''}
              onChange={(e) => {
                const value = e.target.value;
                setTotalBudget(value === '' ? null : parseFloat(value));
              }}
              aria-label="Total Budget Anda (Opsional)"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Membuat Rencana...' : 'Buat Rencana Perjalanan'}
          </button>
        </form>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-8 max-w-2xl mx-auto" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {loading && <LoadingSpinner />}

        {itinerary && itinerary.length > 0 && (
          <section className="mt-12">
            <h2 className="text-3xl font-bold text-center text-blue-700 mb-8">
              Rencana Perjalanan Anda ke {destination}
            </h2>
            <div className="space-y-6">
              {itinerary.map((dayPlan) => (
                <ItineraryCard
                  key={dayPlan.day}
                  dayPlan={dayPlan}
                  onActualCostChange={handleActualCostChange}
                />
              ))}
            </div>
            {renderBudgetSummary()}
            {renderGroundingUrls(groundingUrls)}
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
