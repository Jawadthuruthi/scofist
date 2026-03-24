import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, TrendingUp, BarChart3, Info, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

// Hex hashing mimicking exactly the original Tailwind string arrays natively across dashboard components
const getTeamHexColor = (teamName) => {
  if (!teamName) return "#71717a"; // zinc-500
  const colors = [
    "#2563eb", // blue-600
    "#059669", // emerald-600
    "#e11d48", // rose-600
    "#9333ea", // purple-600
    "#ea580c", // orange-600
    "#0891b2", // cyan-600
    "#c026d3", // fuchsia-600
    "#65a30d", // lime-600
    "#4f46e5", // indigo-600
    "#0d9488"  // teal-600
  ];
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function TeamPointsProgressionViewer({ isOpen, onClose, apiKey }) {
  const [data, setData] = useState([]);
  const [teams, setTeams] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [limitInput, setLimitInput] = useState("");
  const [appliedLimit, setAppliedLimit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWhiteTheme, setIsWhiteTheme] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProgressionData();
    } else {
      setLimitInput("");
    }
  }, [isOpen]);

  const handleApplyLimit = () => {
    fetchProgressionData(limitInput);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleApplyLimit();
  };

  const fetchProgressionData = async (customLimit = null) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = "/api/team-points-progression";
      if (customLimit && customLimit !== "") {
        url += `?limit=${customLimit}`;
      }

      const res = await fetch(url, {
        headers: { "api-key": apiKey },
      });
      const json = await res.json();

      if (json.success) {
        setData(json.data);
        setTeams(json.teams);
        setTotalResults(json.totalResultsAvailable);
        setAppliedLimit(json.appliedLimit);
      } else {
        setError(json.message || "Failed to load graphical rendering data");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-none w-screen h-screen m-0 p-0 rounded-none border-none transition-colors duration-500 overflow-hidden flex flex-col data-[state=open]:duration-500 [&>button]:hidden ${isWhiteTheme ? 'bg-zinc-50' : 'bg-black'}`}>
        <DialogTitle className="sr-only">Team Point Progression Graph</DialogTitle>
        <DialogDescription className="sr-only">Displays full screen timeline displaying analytical charting cumulative metric histories per active team strictly dynamically.</DialogDescription>



        {/* Top Controls Bar - Left Aligned */}
        <div className="relative z-50 flex flex-col md:flex-row items-center justify-start p-6 w-full gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
             {/* Limit Selection Input */}
             <div className={`flex flex-row items-center space-x-2 p-2 rounded-[1.5rem] backdrop-blur-md shadow-2xl border ${isWhiteTheme ? 'bg-white/80 border-zinc-200' : 'bg-zinc-900/80 border-zinc-700/50'}`}>
                <BarChart3 className={`w-5 h-5 ml-3 ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-400'}`} />
                <span className={`font-bold ml-1 tracking-wide uppercase text-sm ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-300'}`}>After</span>
                <input
                  type="number"
                  min="1"
                  max={totalResults || 999}
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="All"
                  className={`w-20 rounded-xl px-2 py-1.5 text-center font-black focus:outline-none transition-colors shadow-inner border-2 ${isWhiteTheme ? 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:border-zinc-400' : 'bg-zinc-950 border-zinc-700/80 text-white focus:border-zinc-500'}`}
                />
                <span className={`font-bold mr-2 tracking-wide uppercase text-sm ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-300'}`}>Results</span>
                <Button 
                   onClick={handleApplyLimit}
                   disabled={loading}
                   className={`font-black uppercase rounded-xl tracking-wider px-4 py-1.5 h-auto border-2 border-transparent transition-transform active:scale-95 ${isWhiteTheme ? 'bg-zinc-900 hover:bg-black text-white' : 'bg-zinc-100 hover:bg-white text-black'}`}
                >
                  Apply
                </Button>
             </div>
             
             {/* Total Results Context */}
             <div className={`text-xs md:text-sm px-5 py-2.5 rounded-2xl border backdrop-blur-sm flex items-center gap-2 font-bold tracking-widest uppercase shadow-lg ${isWhiteTheme ? 'bg-white/50 text-zinc-500 border-zinc-200' : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'}`}>
                <Info className="w-4 h-4" />
                <span>Overall Declared: <strong className={`text-base px-2 py-0.5 rounded-md ml-1 ${isWhiteTheme ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-800 text-white'}`}>{totalResults}</strong></span>
             </div>
          </div>
        </div>

        {/* Main Background Engine */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${isWhiteTheme ? 'opacity-10' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-zinc-950 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black z-0" />
        </div>
        {isWhiteTheme && (
           <div className="absolute inset-0 bg-zinc-50 pointer-events-none">
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#d4d4d8,transparent_80%)] opacity-40" />
             <div className="absolute top-0 right-1/4 w-[40rem] h-[40rem] bg-indigo-300 rounded-full blur-[120px] animate-pulse opacity-20" style={{ animationDuration: '6s' }} />
             <div className="absolute bottom-0 left-1/4 w-[40rem] h-[40rem] bg-cyan-300 rounded-full blur-[120px] animate-pulse opacity-20" style={{ animationDuration: '8s' }} />
           </div>
        )}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none z-[1]" />

        {/* Dynamic Content Container */}
        <div className="relative flex-1 w-full h-full flex flex-col items-center justify-center overflow-hidden z-10 px-6 pb-6 mt-4">
          
          {/* Dashboard Headings */}
          <div className="shrink-0 w-full text-center space-y-2 z-40 mb-8 max-w-5xl mt-4 px-4 pointer-events-none">
            <h1 className={`text-5xl md:text-7xl lg:text-[6rem] leading-none font-black uppercase tracking-tight drop-shadow-2xl ${isWhiteTheme ? 'text-zinc-900' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400'}`}>
              Team Points
            </h1>
            <h2 className={`text-xl md:text-3xl font-black uppercase tracking-widest mt-2 md:mt-4 flex items-center justify-center gap-3 ${isWhiteTheme ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400'}`}>
              <TrendingUp className={`w-6 h-6 md:w-8 md:h-8 ${isWhiteTheme ? 'text-blue-600' : 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]'}`} />
              {appliedLimit && appliedLimit < totalResults ? `After ${appliedLimit} Results Progression` : 'Overall Progression Standings'}
            </h2>
          </div>

          <div className={`w-full max-w-[120rem] flex-1 relative z-20 p-8 md:p-12 pr-12 md:pr-16 rounded-[2rem] border shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-sm min-h-[50vh] transition-all duration-500 ${isWhiteTheme ? 'bg-white/80 border-zinc-200 shadow-xl' : 'bg-zinc-900/40 border-white/10'}`}>
            
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
                <div className="w-16 h-16 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.3)]"></div>
                <p className="text-xl font-medium tracking-widest uppercase text-zinc-400 animate-pulse">Aggregating Timelines...</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
                <p className="text-xl font-medium text-red-500">{error}</p>
              </div>
            )}

            {!loading && !error && data.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isWhiteTheme ? "#e4e4e7" : "#3f3f46"} vertical={false} />
                  
                  <XAxis 
                    dataKey="event" 
                    stroke={isWhiteTheme ? "#71717a" : "#a1a1aa"} 
                    tick={{ fill: isWhiteTheme ? '#71717a' : '#a1a1aa', fontSize: 12, fontWeight: 600 }}
                    tickMargin={15}
                  />
                  
                  <YAxis 
                    stroke={isWhiteTheme ? "#71717a" : "#a1a1aa"} 
                    tick={{ fill: isWhiteTheme ? '#71717a' : '#a1a1aa', fontSize: 14, fontWeight: 700 }}
                    tickMargin={15}
                  />
                  
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isWhiteTheme ? 'rgba(255, 255, 255, 0.95)' : 'rgba(9, 9, 11, 0.95)', 
                      borderColor: isWhiteTheme ? '#e4e4e7' : '#3f3f46', 
                      borderRadius: '12px',
                      color: isWhiteTheme ? '#18181b' : '#ffffff',
                      boxShadow: isWhiteTheme ? '0 10px 25px rgba(0,0,0,0.1)' : '0 10px 25px rgba(0,0,0,0.8)',
                      padding: '16px'
                    }}
                    itemStyle={{ fontSize: '1rem', fontWeight: 'bold' }}
                    labelStyle={{ color: isWhiteTheme ? '#71717a' : '#a1a1aa', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  />
                  
                  <Legend 
                    verticalAlign="bottom" 
                    height={40}
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', fontSize: '1rem', color: isWhiteTheme ? '#18181b' : '#fff' }}
                  />

                  {teams.map((teamName, index) => (
                    <Line
                      key={teamName}
                      type="linear"
                      dataKey={teamName}
                      stroke={getTeamHexColor(teamName)}
                      strokeWidth={4}
                      activeDot={{ r: 5, strokeWidth: 2, fill: isWhiteTheme ? '#fff' : '#000' }}
                      dot={{ r: 2, fill: isWhiteTheme ? '#fff' : '#000', strokeWidth: 2 }}
                      animationDuration={3000}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}

            {!loading && !error && data.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
                <p className="text-2xl font-medium text-zinc-400 tracking-widest">Awaiting Initial Results Declaration</p>
              </div>
            )}
          </div>

          {/* Top Right Controls Group - Placed at end for highest click priority */}
          <div className="absolute top-6 right-6 z-[100] flex items-center gap-4 bg-transparent">
            <button 
              onClick={() => setIsWhiteTheme(!isWhiteTheme)}
              className={`p-3 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-[1.15] active:scale-95 flex items-center justify-center border cursor-pointer pointer-events-auto ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
              title={isWhiteTheme ? "Dark Theme" : "White Theme"}
            >
              {isWhiteTheme ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
            </button>

            <button 
              onClick={onClose}
              className={`p-3 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-[1.15] active:scale-95 flex items-center justify-center border cursor-pointer pointer-events-auto ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
