import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StudentData } from '../services/classService';
import { soundService } from '../../game/services/soundService';

interface MagicCardFlipProps {
  students: StudentData[];
  onSelect: (student: StudentData) => void;
  selectableIds: string[];
  hideSelected: boolean;
}

type GamePhase = 'idle' | 'gathering' | 'shuffling' | 'spread' | 'revealed';

export default function MagicCardFlip({ students, onSelect, selectableIds, hideSelected }: MagicCardFlipProps) {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [cards, setCards] = useState<{ id: string; index: number; shuffleRotate: number; spreadRotate: number; shuffleY: number[] }[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [winner, setWinner] = useState<StudentData | null>(null);

  // Filter students based on hideSelected
  const displayStudents = hideSelected 
    ? students.filter(s => selectableIds.includes(s.id))
    : students;

  useEffect(() => {
    // We don't need to show 50 cards, 12 is enough for the visual effect
    // The actual winner is selected randomly from the full list regardless of which card is clicked
    const numCards = Math.min(displayStudents.length, 12);
    setCards(Array.from({ length: numCards }).map((_, i) => ({ 
      id: `card-${i}`, 
      index: i,
      shuffleRotate: (Math.random() - 0.5) * 40,
      spreadRotate: (Math.random() - 0.5) * 15,
      shuffleY: [(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60]
    })));
    setPhase('idle');
    setSelectedCardId(null);
    setWinner(null);
  }, [displayStudents.length]);

  const handleShuffle = () => {
    if (displayStudents.length === 0) return;
    
    // 1. Reset selected card to flip it back down
    setSelectedCardId(null);
    // 2. Gather cards to center
    setPhase('gathering');
    soundService.play('tick');

    // Determine winner now
    const availableStudents = displayStudents.filter(s => selectableIds.includes(s.id));
    const targetList = availableStudents.length > 0 ? availableStudents : displayStudents;
    const selectedWinner = targetList[Math.floor(Math.random() * targetList.length)];
    setWinner(selectedWinner);

    // 3. Start shuffling animation after gathering
    setTimeout(() => {
      setPhase('shuffling');
      soundService.play('tick');
      
      // 4. Spread cards after shuffling
      setTimeout(() => {
        setPhase('spread');
        soundService.play('item');
      }, 1500);
    }, 400);
  };

  const handleCardClick = (cardId: string) => {
    if (phase !== 'spread') return;
    
    soundService.play('item');
    setSelectedCardId(cardId);
    setPhase('revealed');
    
    soundService.play('correct');

    setTimeout(() => {
      if (winner) {
        onSelect(winner);
      }
    }, 3000);
  };

  // Calculate grid layout for spread phase
  const getCardPosition = (index: number, total: number) => {
    const card = cards[index];
    if (phase === 'idle' || phase === 'gathering' || phase === 'shuffling') {
      return { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, zIndex: index };
    }
    
    if (phase === 'revealed') {
      if (card.id === selectedCardId) {
        return { x: 0, y: -50, rotate: 0, scale: 1.8, opacity: 1, zIndex: 50 };
      }
      return { x: 0, y: 0, rotate: 0, scale: 0.5, opacity: 0, zIndex: 0 };
    }

    // Spread phase - arrange in a grid or arc
    const cols = Math.min(total, 4);
    const rows = Math.ceil(total / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const spacingX = 130;
    const spacingY = 170;
    
    const startX = -((cols - 1) * spacingX) / 2;
    const startY = -((rows - 1) * spacingY) / 2;

    return {
      x: startX + col * spacingX,
      y: startY + row * spacingY,
      rotate: card.spreadRotate,
      scale: 1,
      opacity: 1,
      zIndex: 10
    };
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[600px] relative overflow-hidden bg-slate-950 rounded-2xl p-8">
      {/* Magical Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[80px]" />
        
        {/* Floating particles */}
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
            initial={{ 
              x: Math.random() * 1000 - 500, 
              y: Math.random() * 800 - 400,
              opacity: Math.random() * 0.5 + 0.1
            }}
            animate={{ 
              y: [null, Math.random() * -200 - 100],
              opacity: [null, 0]
            }}
            transition={{ 
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </div>

      {/* Cards Area */}
      <div className="relative w-full h-[400px] flex items-center justify-center z-10 perspective-[1000px]">
        {cards.map((card, index) => {
          const pos = getCardPosition(index, cards.length);
          const isSelected = card.id === selectedCardId;
          
          return (
            <motion.div
              key={card.id}
              className="absolute w-28 h-40 cursor-pointer"
              style={{ transformStyle: 'preserve-3d' }}
              initial={{ x: 0, y: 0, rotate: 0 }}
              animate={
                phase === 'shuffling' 
                ? {
                    x: [
                      0, 
                      index % 2 === 0 ? -90 : 90, 
                      0, 
                      index % 3 === 0 ? -90 : 90, 
                      0
                    ],
                    y: [
                      0, 
                      card.shuffleY[0], 
                      0, 
                      card.shuffleY[1], 
                      0
                    ],
                    rotate: [
                      0, 
                      index % 2 === 0 ? -15 : 15, 
                      0, 
                      index % 3 === 0 ? -15 : 15, 
                      0
                    ],
                    scale: 1,
                    opacity: 1,
                    rotateY: 0,
                    zIndex: index
                  }
                : {
                    x: pos.x,
                    y: pos.y,
                    rotate: pos.rotate,
                    scale: pos.scale,
                    opacity: pos.opacity,
                    rotateY: isSelected ? 180 : 0,
                    zIndex: pos.zIndex
                  }
              }
              transition={
                phase === 'shuffling'
                ? {
                    duration: 1.5,
                    times: [0, 0.25, 0.5, 0.75, 1],
                    ease: "easeInOut"
                  }
                : { 
                    type: "spring", 
                    stiffness: phase === 'gathering' ? 200 : 60, 
                    damping: phase === 'gathering' ? 20 : 12,
                    mass: 1,
                    delay: phase === 'spread' ? index * 0.08 : 0
                  }
              }
              onClick={() => handleCardClick(card.id)}
              whileHover={phase === 'spread' ? { scale: 1.1, y: pos.y - 10, zIndex: 20 } : {}}
            >
              {/* Card Back */}
              <div 
                className={`absolute inset-0 rounded-xl border-2 border-indigo-400/50 bg-gradient-to-br from-indigo-900 to-purple-900 shadow-[0_0_15px_rgba(79,70,229,0.5)] flex items-center justify-center overflow-hidden`}
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxwYXRoIGQ9Ik0wIDBoMjB2MjBIMHoiIGZpbGw9Im5vbmUiLz4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+Cjwvc3ZnPg==')] opacity-50" />
                <div className="w-16 h-16 border border-indigo-300/30 rounded-full flex items-center justify-center">
                  <div className="w-10 h-10 border border-indigo-300/30 rotate-45" />
                </div>
              </div>

              {/* Card Front (Revealed) */}
              <div 
                className={`absolute inset-0 rounded-xl border-2 border-yellow-400 bg-gradient-to-br from-slate-100 to-white shadow-[0_0_30px_rgba(250,204,21,0.6)] flex flex-col items-center justify-center p-2`}
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.2)_0%,transparent_70%)]" />
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Định mệnh</span>
                <span className="text-2xl font-black text-gray-900 text-center leading-tight">
                  {winner?.name}
                </span>
              </div>
            </motion.div>
          );
        })}
        
        {/* Instruction Text */}
        <AnimatePresence>
          {phase === 'spread' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -bottom-16 text-indigo-200 font-medium tracking-widest uppercase text-lg"
            >
              Hãy chọn một lá bài
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Button */}
      <AnimatePresence>
        {(phase === 'idle' || phase === 'revealed') && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={handleShuffle}
            disabled={displayStudents.length === 0}
            className={`mt-16 px-12 py-4 rounded-full font-bold text-xl tracking-widest text-white transition-all z-30 border border-indigo-400/30
              ${displayStudents.length === 0 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)]'
              }`}
          >
            {phase === 'revealed' ? 'XÀO LẠI' : 'XÀO BÀI'}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
