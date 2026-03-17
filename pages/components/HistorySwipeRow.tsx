import React, { useState } from 'react';
import { Exercise } from '../../types';

type SwipeState = {
  offsetX: number;
  dragging: boolean;
  directionLocked: boolean;
  horizontalGesture: boolean;
  startX: number;
  startY: number;
  pointerId: number | null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const HistorySwipeRow: React.FC<{
  item: Exercise;
  onOpen: () => void;
  onClose: () => void;
  isAnyOpen: boolean;
  onNavigate: () => void;
  onDelete: () => void;
}> = ({ item, onOpen, onClose, isAnyOpen, onNavigate, onDelete }) => {
  const MAX_SWIPE = 92;
  const DELETE_THRESHOLD = 140;

  const [removing, setRemoving] = useState(false);
  const [swipe, setSwipe] = useState<SwipeState>({
    offsetX: 0,
    dragging: false,
    directionLocked: false,
    horizontalGesture: false,
    startX: 0,
    startY: 0,
    pointerId: null
  });

  const isOpen = swipe.offsetX === -MAX_SWIPE && !swipe.dragging;

  const handleDelete = () => {
    setRemoving(true);
    setTimeout(() => onDelete(), 220);
  };

  const settle = (finalOffset: number) => {
    setSwipe(prev => ({ ...prev, dragging: false, pointerId: null, offsetX: finalOffset }));
  };

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isAnyOpen && !isOpen) return;

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setSwipe(prev => ({
      ...prev,
      dragging: true,
      directionLocked: false,
      horizontalGesture: false,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId
    }));
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = e => {
    setSwipe(prev => {
      if (!prev.dragging || prev.pointerId !== e.pointerId) return prev;

      const dx = e.clientX - prev.startX;
      const dy = e.clientY - prev.startY;

      if (!prev.directionLocked) {
        const lock = Math.abs(dx) > 6 || Math.abs(dy) > 6;
        if (!lock) return prev;
        const horizontalGesture = Math.abs(dx) > Math.abs(dy) * 1.15;
        return { ...prev, directionLocked: true, horizontalGesture };
      }

      if (!prev.horizontalGesture) return prev;

      const base = isOpen ? -MAX_SWIPE : 0;
      const nextOffset = clamp(base + dx, -200, 0);
      return { ...prev, offsetX: nextOffset };
    });
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = e => {
    setSwipe(prev => {
      if (!prev.dragging || prev.pointerId !== e.pointerId) return prev;

      if (!prev.horizontalGesture) {
        const next = { ...prev, dragging: false, pointerId: null };
        if (isOpen) onClose();
        return next;
      }

      const dx = e.clientX - prev.startX;
      const releasedOffset = prev.offsetX;
      const shouldDelete = releasedOffset <= -DELETE_THRESHOLD;
      const shouldOpen = releasedOffset <= -MAX_SWIPE * 0.55 || dx < -40;

      queueMicrotask(() => {
        if (shouldDelete) {
          settle(-DELETE_THRESHOLD);
          handleDelete();
          return;
        }
        if (shouldOpen) {
          settle(-MAX_SWIPE);
          onOpen();
        } else {
          settle(0);
          onClose();
        }
      });

      return { ...prev, dragging: false, pointerId: null };
    });
  };

  const handlePointerCancel: React.PointerEventHandler<HTMLDivElement> = e => {
    setSwipe(prev => {
      if (prev.pointerId !== e.pointerId) return prev;
      queueMicrotask(() => {
        if (isOpen) settle(-MAX_SWIPE);
        else settle(0);
      });
      return { ...prev, dragging: false, pointerId: null };
    });
  };

  const handleClick: React.MouseEventHandler<HTMLDivElement> = e => {
    if (swipe.dragging) return;
    if (isOpen) {
      e.preventDefault();
      onClose();
      settle(0);
      return;
    }
    onNavigate();
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl ${
        removing
          ? 'max-h-0 opacity-0 scale-[0.98] -mb-4 transition-all duration-200 ease-in'
          : 'max-h-[220px] opacity-100 scale-100 transition-all duration-200 ease-out'
      }`}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4">
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete();
            }}
            className="h-10 px-4 rounded-xl bg-white/15 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Apagar
          </button>
        </div>

        <div
          role="button"
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClick={handleClick}
          style={{ transform: `translateX(${swipe.offsetX}px)` }}
          className={`bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer ${
            swipe.dragging ? '' : 'transition-transform duration-200 ease-out'
          } active:scale-[0.98]`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex gap-3">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">
                  {item.subject === 'Matemática' ? 'calculate' : 'menu_book'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-primary mb-1 block">{item.subject}</span>
                <h4 className="font-bold">{item.title}</h4>
              </div>
            </div>
            {item.score != null && (
              <div className="flex flex-col items-end">
                <span className="text-xl font-black text-primary">{Number(item.score).toFixed(1)}</span>
                <span className="text-[10px] font-bold uppercase text-text-sub">Pontos</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs text-text-sub font-medium">
              <span>{item.childName}</span>
              <span>•</span>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <button
              type="button"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                if (isOpen) {
                  onClose();
                  settle(0);
                  return;
                }
                onNavigate();
              }}
              className="text-xs font-bold text-primary flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              Ver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistorySwipeRow;

