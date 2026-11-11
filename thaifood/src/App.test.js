import { render, screen } from '@testing-library/react';
import App from './App';
test('renders ThaiFood Guide discovery home and mock restaurant results', async () => {
  window.scrollTo = jest.fn();
  window.history.replaceState({}, '', '/');
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ทุกจังหวัด');
  expect(screen.getByRole('button', { name: /ค้นหาร้านอร่อย/ })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'ข้าวซอยริมสวน' })).toBeInTheDocument();
});
