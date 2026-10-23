const DEAL_1_IMG = '/landscapes/new zea.jpg';
const DEAL_2_IMG = '/landscapes/ausi.jpg';
const DEAL_3_IMG = '/landscapes/india.jpg';

const deals = [
  { title: 'New Zealand', desc: 'Tap to save $300 off select flights to New Zealand', img: DEAL_1_IMG, badge: '100% PURE NEW ZEALAND' },
  { title: 'Australia', desc: 'Tap to save 35% off hotels', img: DEAL_2_IMG, badge: 'VISIT AUSTRALIA' },
  { title: 'India', desc: 'Tap to save 30% off hotels', img: DEAL_3_IMG, badge: 'DISCOVER INDIA' },
];

// Add the onSeeAll prop
export default function DealsSection({ onSeeAll }) {
  return (
    <div className="max-w-6xl mx-auto py-16 px-4">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Deals for top destinations</h2>
          <p className="text-sm text-gray-500">Sponsored</p>
        </div>
        {/* Attach the click handler */}
        <button onClick={onSeeAll} className="text-blue-600 font-medium hover:underline text-sm cursor-pointer">
          See all
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {deals.map((deal, idx) => (
          <div key={idx} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="relative h-56">
              <img src={deal.img} alt={deal.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
                <span className="text-white font-bold text-center text-xl tracking-wider drop-shadow-md">{deal.badge}</span>
              </div>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{deal.title}</h3>
              <p className="text-gray-500 text-sm mb-6 flex-grow">{deal.desc}</p>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-6 rounded-lg self-start transition-colors">
                Claim now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}