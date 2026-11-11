import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewForm from './ReviewForm';

test('rejects short review and sends a 1–5 rating with trimmed text', async () => {
  const onSubmit = jest.fn().mockResolvedValue({});
  render(<ReviewForm onSubmit={onSubmit} />);
  fireEvent.change(screen.getByLabelText('รีวิวของคุณ'), { target: { value: 'สั้น' } });
  fireEvent.click(screen.getByRole('button', { name: 'ส่งรีวิว' }));
  expect(screen.getByRole('alert')).toHaveTextContent('10');
  expect(onSubmit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('radio', { name: '4 ดาว' }));
  fireEvent.change(screen.getByLabelText('รีวิวของคุณ'), { target: { value: '  อาหารอร่อยและบริการดีมาก  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'ส่งรีวิว' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ rating: 4, text: 'อาหารอร่อยและบริการดีมาก' }));
});
test('retains entered text after an API conflict', async () => {
  render(<ReviewForm onSubmit={() => Promise.reject(new Error('คุณรีวิวร้านนี้แล้ว'))} />);
  fireEvent.change(screen.getByLabelText('รีวิวของคุณ'), { target: { value: 'อาหารอร่อยและบริการดีมาก' } });
  fireEvent.click(screen.getByRole('button', { name: 'ส่งรีวิว' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('คุณรีวิวร้านนี้แล้ว');
  expect(screen.getByLabelText('รีวิวของคุณ')).toHaveValue('อาหารอร่อยและบริการดีมาก');
});
