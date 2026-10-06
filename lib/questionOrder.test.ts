import { describe, expect, it } from 'vitest';
import { chooseQuestionOrder } from './questionOrder';

const IDS = Array.from({ length: 35 }, (_, index) => index + 1);

describe('chooseQuestionOrder', () => {
  it('devolve exatamente o comprimento pedido, sem repetir', () => {
    const order = chooseQuestionOrder(IDS, 10, (values) => values);
    expect(order).toHaveLength(10);
    expect(new Set(order).size).toBe(10);
    expect(order.every((id) => IDS.includes(id))).toBe(true);
  });

  it('nunca inventa ids que nao existem no banco', () => {
    const order = chooseQuestionOrder([7, 9, 11], 5, (values) => values);
    expect(order.slice().sort((a, b) => a - b)).toEqual([7, 9, 11]);
  });

  it('usa o banco inteiro quando o comprimento pedido passa do banco', () => {
    const order = chooseQuestionOrder(IDS, 99, (values) => values);
    expect(order).toHaveLength(35);
  });

  it('recusa um sorteio que perca ou duplique ids', () => {
    expect(() => chooseQuestionOrder(IDS, 10, (values) => values.slice(1))).toThrow();
  });
});
