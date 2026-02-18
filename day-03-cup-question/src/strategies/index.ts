import { PromptingStrategy } from '../types';
import { DirectStrategy } from './direct';
import { StepByStepStrategy } from './step-by-step';
import { MetaPromptStrategy } from './meta-prompt';
import { ExpertGroupStrategy } from './expert-group';

/**
 * Все доступные стратегии промптинга
 */
export const strategies: PromptingStrategy[] = [
  new DirectStrategy(),
  new StepByStepStrategy(),
  new MetaPromptStrategy(),
  new ExpertGroupStrategy(),
];

export { DirectStrategy, StepByStepStrategy, MetaPromptStrategy, ExpertGroupStrategy };
