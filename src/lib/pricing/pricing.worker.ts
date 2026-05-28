// src/lib/pricing/pricing.worker.ts

import { PricingEngine } from './PricingEngine';
import { ItemData } from '@/types';
import { PricingContext } from './types';

// Define message types for strict typing
export type WorkerMessage = {
  id: string;
  items: ItemData[];
  // ✅ Inject Config (Formulas) here
  context: PricingContext;
};

export type WorkerResponse = {
  id: string;
  results: Array<{ itemId: string; total: number }>;
  error?: string;
};

// Listen for messages from the main thread
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { id, items, context } = e.data;

  try {
    // Perform heavy calculations off the main thread
    const results = items.map((item) => {
      // PricingEngine is pure logic, safe to run here
      return {
        itemId: item.id,
        total: PricingEngine.calculatePrice(item, context),
      };
    });

    const response: WorkerResponse = { id, results };
    self.postMessage(response);
  } catch (error) {
    console.error('Worker Calculation Error:', error);
    self.postMessage({
      id,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown worker error'
    } as WorkerResponse);
  }
};