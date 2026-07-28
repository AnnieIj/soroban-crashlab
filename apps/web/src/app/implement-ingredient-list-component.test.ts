import * as assert from 'node:assert/strict';
import { IngredientList, Ingredient } from './implement-ingredient-list-component';

const ingredients: Ingredient[] = [
  { id: '1', name: 'Flour', amount: '500', unit: 'g', note: 'All-purpose' },
  { id: '2', name: 'Sugar', amount: '200', unit: 'g' },
  { id: '3', name: 'Eggs', amount: '2', unit: '' },
];

const runAssertions = () => {
  const successElement = IngredientList({ ingredients, dataState: 'success' });
  assert.equal(successElement.props['aria-label'], 'Ingredient list');

  const loadingElement = IngredientList({ dataState: 'loading' });
  assert.equal(loadingElement.props['aria-busy'], 'true');

  const errorElement = IngredientList({ dataState: 'error', errorMessage: 'boom', onRetry: () => {} });
  assert.equal(typeof errorElement.type, 'function');

  const emptyElement = IngredientList({ ingredients: [], dataState: 'success' });
  assert.equal(emptyElement.type, 'section');

  const renderedSuccess = IngredientList({ ingredients, dataState: 'success' });
  assert.equal(renderedSuccess.type, 'section');
};

runAssertions();
console.log('implement-ingredient-list-component.test.ts: all assertions passed');
