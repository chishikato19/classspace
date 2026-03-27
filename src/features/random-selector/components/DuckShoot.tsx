import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Target } from 'lucide-react';
import { StudentData } from '../services/classService';
import { soundService } from '../../game/services/soundService';

interface DuckShootProps {
  students: StudentData[];
  onSelect: (student: StudentData) => void;
  selectableIds: string[];
  hideSelected: boolean;
}

interface Duck {
  uniqueId: string;
  studentId: string;
  name: string;
  row: number;
  x: number;
  y: number;
  speed: number;
  direction: 1 | -1;
  ref: React.RefObject<HTMLDivElement | null>;
  isShot: boolean;
}

export default function DuckShoot({ students, onSelect, selectableIds, hideSelected }: DuckShootProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<SVGSVGElement>(null);
  const ducksRef = useRef<Duck[]>([]);
  const requestRef = useRef<number>(0);
  
  const [isShooting, setIsShooting] = useState(false);
  const [, forceRender] = useState({});
  
  const shootStateRef = useRef<{
    active: boolean;
    lastJumpTime: number;
    jumpDuration: number;
    jumpsRemaining: number;
    waitingJumps: number;
    currentTargetId: string | null;
    finalTargetId: string | null;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>({
    active: false,
    lastJumpTime: 0,
    jumpDuration: 400,
    jumpsRemaining: 0,
    waitingJumps: 0,
    currentTargetId: null,
    finalTargetId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const activeStudents = hideSelected ? students.filter(s => selectableIds.includes(s.id)) : students;

  useEffect(() => {
    initDucks();
  }, [students, selectableIds, hideSelected]);

  const DUCK_SPACING = 260;

  const initDucks = () => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const rows = 2;
    const rowHeight = height / rows;
    
    let extendedStudents = [...activeStudents];
    if (extendedStudents.length === 0) return;

    // Ensure enough ducks to cover the screen plus a large buffer
    const requiredDucksPerRow = Math.max(20, Math.ceil((width + 2000) / DUCK_SPACING));
    const totalRequiredDucks = requiredDucksPerRow * rows;
    
    while (extendedStudents.length < totalRequiredDucks) {
      extendedStudents = [...extendedStudents, ...activeStudents];
    }
    
    // Trim to exactly totalRequiredDucks to ensure equal ducks per row
    extendedStudents = extendedStudents.slice(0, totalRequiredDucks);

    if (ducksRef.current.length !== totalRequiredDucks) {
      const newDucks: Duck[] = extendedStudents.map((student, index) => {
        const row = index % rows;
        const direction = row % 2 === 0 ? 1 : -1;
        const indexInRow = Math.floor(index / rows);
        
        const startX = direction === 1 
          ? (indexInRow * DUCK_SPACING) - 300 
          : width + (indexInRow * DUCK_SPACING) + 300;

        return {
          uniqueId: `duck-${index}`,
          studentId: student.id,
          name: student.name,
          row,
          x: startX,
          y: row * rowHeight + (rowHeight / 2) - 80,
          speed: 1.2 + (row * 0.3),
          direction,
          ref: React.createRef<HTMLDivElement>(),
          isShot: false,
        };
      });

      ducksRef.current = newDucks;
    } else {
      // Update existing ducks to maintain positions
      ducksRef.current.forEach((duck, index) => {
        const student = extendedStudents[index];
        duck.studentId = student.id;
        duck.name = student.name;
        
        if (duck.isShot) {
          duck.isShot = false;
          // Move to the back of the line
          if (duck.direction === 1) {
            const rowDucks = ducksRef.current.filter(d => d.row === duck.row && d.uniqueId !== duck.uniqueId && !d.isShot);
            const minX = rowDucks.length > 0 ? Math.min(...rowDucks.map(d => d.x)) : width;
            duck.x = minX - DUCK_SPACING;
          } else {
            const rowDucks = ducksRef.current.filter(d => d.row === duck.row && d.uniqueId !== duck.uniqueId && !d.isShot);
            const maxX = rowDucks.length > 0 ? Math.max(...rowDucks.map(d => d.x)) : 0;
            duck.x = maxX + DUCK_SPACING;
          }
          
          if (duck.ref.current) {
            duck.ref.current.style.transition = 'none';
            duck.ref.current.style.opacity = '1';
            duck.ref.current.style.transform = `translate3d(${duck.x}px, ${duck.y}px, 0)`;
            // Force reflow
            void duck.ref.current.offsetHeight;
          }
        }
      });
    }
    forceRender({});
  };

  const easeInOutCubic = (x: number): number => {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const height = containerRef.current.clientHeight;
      const rows = 2;
      const rowHeight = height / rows;
      
      ducksRef.current.forEach(duck => {
        duck.y = duck.row * rowHeight + (rowHeight / 2) - 80;
      });
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const animate = (time: number) => {
    if (!containerRef.current) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const width = containerRef.current.clientWidth;
    const duckWidth = 240;

    // 1. Move Ducks
    ducksRef.current.forEach(duck => {
      if (duck.isShot) return;

      duck.x += duck.speed * duck.direction;

      // Wrap around screen with buffer and maintain spacing
      if (duck.direction === 1 && duck.x > width + 240) {
        const rowDucks = ducksRef.current.filter(d => d.row === duck.row && d.uniqueId !== duck.uniqueId && !d.isShot);
        const minX = rowDucks.length > 0 ? Math.min(...rowDucks.map(d => d.x)) : width;
        duck.x = minX - DUCK_SPACING;
      } else if (duck.direction === -1 && duck.x < -240) {
        const rowDucks = ducksRef.current.filter(d => d.row === duck.row && d.uniqueId !== duck.uniqueId && !d.isShot);
        const maxX = rowDucks.length > 0 ? Math.max(...rowDucks.map(d => d.x)) : 0;
        duck.x = maxX + DUCK_SPACING;
      }

      if (duck.ref.current) {
        duck.ref.current.style.transform = `translate3d(${duck.x}px, ${duck.y}px, 0)`;
      }
    });

    // 2. Handle Shooting Animation
    const shootState = shootStateRef.current;
    if (shootState.active && spotlightRef.current && crosshairRef.current) {
      const now = time;
      let elapsedSinceJump = now - shootState.lastJumpTime;

      if (elapsedSinceJump >= shootState.jumpDuration) {
        if (shootState.jumpsRemaining <= 0 && shootState.finalTargetId && shootState.currentTargetId === shootState.finalTargetId) {
          shootState.active = false;
          const targetDuck = ducksRef.current.find(d => d.uniqueId === shootState.finalTargetId);

          if (targetDuck) {
            soundService.play('correct');
            targetDuck.isShot = true;
            if (targetDuck.ref.current) {
              targetDuck.ref.current.style.transform += ' scale(0) rotate(720deg)';
              targetDuck.ref.current.style.opacity = '0';
              targetDuck.ref.current.style.transition = 'all 0.5s ease-out';
            }

            const winningStudent = activeStudents.find(s => s.id === targetDuck.studentId);
            if (winningStudent) {
              setTimeout(() => {
                setIsShooting(false);
                onSelect(winningStudent);
                // Reset spotlight
                if (spotlightRef.current && crosshairRef.current) {
                  spotlightRef.current.classList.add('hidden');
                  crosshairRef.current.classList.add('hidden');
                }
              }, 1000); // Wait 1s before showing modal
            }
          }
        } else {
          // Start next jump
          shootState.startX = shootState.currentX;
          shootState.startY = shootState.currentY;
          shootState.lastJumpTime = now;
          elapsedSinceJump = 0;

          const safePadding = Math.max(width * 0.2, 100);
          const isSafe = (d: Duck) => d.x > safePadding && d.x < width - duckWidth - safePadding;

          if (shootState.jumpsRemaining > 0) {
            shootState.jumpsRemaining--;
            const safeDucks = ducksRef.current.filter(d => isSafe(d) && d.uniqueId !== shootState.finalTargetId && !d.isShot);
            if (safeDucks.length > 0) {
              shootState.currentTargetId = safeDucks[Math.floor(Math.random() * safeDucks.length)].uniqueId;
            } else {
              // Fallback to any duck on screen or just any duck
              const onScreen = ducksRef.current.filter(d => d.x > 0 && d.x < width - duckWidth && !d.isShot);
              shootState.currentTargetId = onScreen.length > 0 
                ? onScreen[Math.floor(Math.random() * onScreen.length)].uniqueId
                : ducksRef.current[Math.floor(Math.random() * ducksRef.current.length)].uniqueId;
            }
          } else {
            if (!shootState.finalTargetId) {
              // Find all valid students that are currently safe
              let safeValidDucks = ducksRef.current.filter(d => isSafe(d) && selectableIds.includes(d.studentId) && !d.isShot);
              
              if (safeValidDucks.length === 0) {
                // If no valid duck is safe right now, force one to be safe by teleporting it
                const validDucks = ducksRef.current.filter(d => selectableIds.includes(d.studentId) && !d.isShot);
                const forcedDuck = validDucks[Math.floor(Math.random() * validDucks.length)];
                if (forcedDuck) {
                  forcedDuck.x = width / 2 - duckWidth / 2; // Teleport to center
                  safeValidDucks = [forcedDuck];
                }
              }
              
              if (safeValidDucks.length > 0) {
                shootState.finalTargetId = safeValidDucks[Math.floor(Math.random() * safeValidDucks.length)].uniqueId;
              }
            }
            shootState.currentTargetId = shootState.finalTargetId;
          }
        }
      }

      if (shootState.active) {
        const moveDuration = shootState.jumpDuration * 0.6; // Move for 60% of the time, stay for 40%
        const progress = Math.min(elapsedSinceJump / moveDuration, 1);
        const easedProgress = easeInOutCubic(progress);

        const targetDuck = ducksRef.current.find(d => d.uniqueId === shootState.currentTargetId);
        let endX = shootState.startX;
        let endY = shootState.startY;

        if (targetDuck) {
          endX = targetDuck.x + duckWidth / 2;
          endY = targetDuck.y + 50; // Shifted up to avoid covering the name
        }

        shootState.currentX = shootState.startX + (endX - shootState.startX) * easedProgress;
        shootState.currentY = shootState.startY + (endY - shootState.startY) * easedProgress;

        // Strict clamping to keep crosshair within container bounds
        const clampedX = Math.max(40, Math.min(width - 40, shootState.currentX));
        const clampedY = Math.max(40, Math.min(containerRef.current.clientHeight - 40, shootState.currentY));

        spotlightRef.current.style.background = `radial-gradient(circle at ${clampedX}px ${clampedY}px, transparent 150px, rgba(0,0,0,0.95) 300px)`;
        crosshairRef.current.style.transform = `translate3d(${clampedX - 32}px, ${clampedY - 32}px, 0)`;
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useLayoutEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [activeStudents]);

  const handleShoot = () => {
    if (activeStudents.length === 0 || !containerRef.current || isShooting) return;

    // Only pick from selectableIds
    const validStudents = activeStudents.filter(s => selectableIds.includes(s.id));
    if (validStudents.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const duckWidth = 240;
    const safePadding = Math.max(width * 0.2, 100);
    const isSafe = (d: Duck) => d.x > safePadding && d.x < width - duckWidth - safePadding && !d.isShot;

    const validDucks = ducksRef.current.filter(d => selectableIds.includes(d.studentId) && !d.isShot);
    if (validDucks.length === 0) return;

    const safeDucks = validDucks.filter(isSafe);
    const firstTarget = safeDucks.length > 0 
      ? safeDucks[Math.floor(Math.random() * safeDucks.length)] 
      : validDucks[0];

    shootStateRef.current = {
      active: true,
      lastJumpTime: performance.now(),
      jumpDuration: 700, // Faster jumps
      jumpsRemaining: 4 + Math.floor(Math.random() * 3), // Fewer jumps
      waitingJumps: 0,
      currentTargetId: firstTarget?.uniqueId || null,
      finalTargetId: null,
      startX: width / 2,
      startY: height / 2,
      currentX: width / 2,
      currentY: height / 2,
    };

    setIsShooting(true);
    
    if (spotlightRef.current && crosshairRef.current) {
      spotlightRef.current.classList.remove('hidden');
      crosshairRef.current.classList.remove('hidden');
      spotlightRef.current.style.background = `radial-gradient(circle at ${width/2}px ${height/2}px, transparent 150px, rgba(0,0,0,0.95) 300px)`;
      crosshairRef.current.style.transform = `translate3d(${width/2 - 32}px, ${height/2 - 32}px, 0)`;
    }
  };

  return (
    <div className="w-full h-full min-h-[500px] relative rounded-xl overflow-hidden bg-sky-300 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" ref={containerRef}>
      <div className="absolute bottom-0 w-full h-1/3 bg-blue-500/20 backdrop-blur-[2px] border-t-4 border-blue-400/50"></div>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {ducksRef.current.map(duck => (
          <div
            key={duck.uniqueId}
            ref={duck.ref}
            className="absolute top-0 left-0 flex flex-col items-center justify-center will-change-transform"
            style={{ width: 240, height: 160 }}
          >
            <div 
              className="text-[96px] drop-shadow-lg leading-none"
              style={{ transform: duck.direction === 1 ? 'scaleX(-1)' : 'scaleX(1)' }}
            >
              🦆
            </div>
            <div className="bg-white/90 px-6 py-2 rounded-full text-2xl font-bold text-gray-800 shadow-sm border border-gray-200 whitespace-nowrap mt-2">
              {duck.name}
            </div>
          </div>
        ))}
      </div>

      <div 
        ref={spotlightRef}
        className="absolute inset-0 pointer-events-none z-40 hidden transition-opacity duration-300"
      ></div>
      
      <svg 
        ref={crosshairRef}
        className="absolute top-0 left-0 w-16 h-16 text-red-500 pointer-events-none z-50 hidden drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="22" y1="12" x2="18" y2="12"></line>
        <line x1="6" y1="12" x2="2" y2="12"></line>
        <line x1="12" y1="6" x2="12" y2="2"></line>
        <line x1="12" y1="22" x2="12" y2="18"></line>
        <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
      </svg>

      {!isShooting && activeStudents.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={handleShoot}
            disabled={selectableIds.length === 0}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:shadow-none text-white px-12 py-4 rounded-full font-black text-2xl shadow-[0_8px_0_rgb(185,28,28)] hover:shadow-[0_4px_0_rgb(185,28,28)] hover:translate-y-1 transition-all flex items-center gap-3 border-4 border-white"
          >
            <Target size={32} /> BẮN!
          </button>
        </div>
      )}
    </div>
  );
}
