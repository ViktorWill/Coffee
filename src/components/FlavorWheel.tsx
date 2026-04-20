import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown } from '@phosphor-icons/react';
import { FlavorCategory, FlavorNote } from '@/lib/types';
import { FLAVOR_WHEEL } from '@/lib/constants';

const CATEGORY_COLORS: Record<FlavorCategory, string> = {
  spicy: 'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300 hover:border-orange-400',
  chocolate: 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300 hover:border-yellow-400',
  floral: 'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300 hover:border-purple-400',
  nutty: 'bg-gradient-to-br from-amber-100 to-amber-200 border-amber-300 hover:border-amber-400',
  earthy: 'bg-gradient-to-br from-green-100 to-green-200 border-green-300 hover:border-green-400',
  fruity: 'bg-gradient-to-br from-pink-100 to-pink-200 border-pink-300 hover:border-pink-400',
};

const FLAVOR_BUTTON_COLORS: Record<FlavorCategory, string> = {
  nutty: 'bg-amber-50 border-amber-200 hover:bg-amber-100 data-[selected=true]:bg-amber-200 data-[selected=true]:border-amber-400',
  floral: 'bg-purple-50 border-purple-200 hover:bg-purple-100 data-[selected=true]:bg-purple-200 data-[selected=true]:border-purple-400',
  earthy: 'bg-green-50 border-green-200 hover:bg-green-100 data-[selected=true]:bg-green-200 data-[selected=true]:border-green-400',
  spicy: 'bg-orange-50 border-orange-200 hover:bg-orange-100 data-[selected=true]:bg-orange-200 data-[selected=true]:border-orange-400',
  fruity: 'bg-pink-50 border-pink-200 hover:bg-pink-100 data-[selected=true]:bg-pink-200 data-[selected=true]:border-pink-400',
  chocolate: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 data-[selected=true]:bg-yellow-200 data-[selected=true]:border-yellow-400',
};

interface FlavorWheelProps {
  selectedFlavors: FlavorNote[];
  onFlavorToggle: (category: FlavorCategory, flavor: string) => void;
}

export function FlavorWheel({ selectedFlavors, onFlavorToggle }: FlavorWheelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<FlavorCategory>>(new Set());

  const toggleCategory = (category: FlavorCategory) => {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const isFlavorSelected = (category: FlavorCategory, flavor: string) => {
    return selectedFlavors.some(
      (f) => f.category === category && f.flavor === flavor
    );
  };

  const getCategorySelectionCount = (category: FlavorCategory) => {
    return selectedFlavors.filter((f) => f.category === category).length;
  };

  const categories = Object.keys(FLAVOR_WHEEL) as FlavorCategory[];

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const isExpanded = expandedCategories.has(category);
        const selectionCount = getCategorySelectionCount(category);

        return (
          <div key={category} className="overflow-hidden rounded-lg border">
            <button
              type="button"
              onClick={() => toggleCategory(category)}
              className={cn(
                'w-full flex items-center justify-between p-3 text-left font-medium transition-colors border-2',
                CATEGORY_COLORS[category]
              )}
            >
              <div className="flex items-center gap-2">
                <span className="capitalize">{category}</span>
                {selectionCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/80 text-xs font-bold">
                    {selectionCount}
                  </span>
                )}
              </div>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <CaretDown size={20} weight="bold" />
              </motion.div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-card flex flex-wrap gap-2">
                    {FLAVOR_WHEEL[category].map((flavor) => (
                      <button
                        key={flavor}
                        type="button"
                        onClick={() => onFlavorToggle(category, flavor)}
                        data-selected={isFlavorSelected(category, flavor)}
                        className={cn(
                          'px-3 py-1.5 rounded-md border text-xs font-medium transition-all',
                          FLAVOR_BUTTON_COLORS[category]
                        )}
                      >
                        {flavor}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
