import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import RestaurantCard from './RestaurantCard';
import RestaurantGrid from './RestaurantGrid';

const restaurant = {
  id: 501, name: 'ครัวสายลม', province: 'เชียงใหม่', category: 'อาหารเหนือ',
  address: 'ถนนนิมมานเหมินท์ อำเภอเมือง', imageUrl: '/images/food-noodles.svg',
  rating: 4.5, reviewCount: 12,
};
function Location() {
  const location = useLocation();
  return <output aria-label="เส้นทางปัจจุบัน">{location.pathname}</output>;
}
function mount(ui) {
  return render(<MemoryRouter initialEntries={['/favorites']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}<Location /></MemoryRouter>);
}

test('one named restaurant link contains the decorative image, heading and accessible metadata', () => {
  mount(<RestaurantCard restaurant={restaurant} />);
  const link = screen.getByRole('link', { name: 'ครัวสายลม', exact: true });
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(link).toHaveAttribute('href', '/restaurants/501');
  expect(link).toContainElement(screen.getByRole('heading', { name: 'ครัวสายลม', level: 3 }));
  const image = document.querySelector('img');
  expect(link).toContainElement(image);
  expect(image).toHaveAttribute('alt', '');
  expect(image).toHaveAttribute('loading', 'lazy');
  expect(image).toHaveAttribute('decoding', 'async');
  expect(image).toHaveAttribute('width', '640');
  expect(image).toHaveAttribute('height', '480');
  expect(screen.getByText('อาหารเหนือ').closest('[aria-hidden="true"]')).toBeNull();
  expect(screen.getByText('เชียงใหม่')).toBeInTheDocument();
  expect(screen.getByText('ถนนนิมมานเหมินท์ อำเภอเมือง')).toBeInTheDocument();
  expect(screen.getByText('4.5')).toBeInTheDocument();
  expect(screen.getByText('(12 รีวิว)')).toBeInTheDocument();
  fireEvent.click(link);
  expect(screen.getByLabelText('เส้นทางปัจจุบัน')).toHaveTextContent('/restaurants/501');
});

test('an unrated restaurant never gets a fabricated score or review total', () => {
  mount(<RestaurantCard restaurant={{ ...restaurant, rating: null, reviewCount: 0 }} />);
  expect(screen.getByText('ยังไม่มีคะแนน')).toBeInTheDocument();
  expect(screen.queryByText('4.5')).not.toBeInTheDocument();
  expect(screen.queryByText(/\(.*รีวิว\)/)).not.toBeInTheDocument();
});

test('a supplied score does not invent a missing review count', () => {
  mount(<RestaurantCard restaurant={{ ...restaurant, rating: 3.75, reviewCount: undefined }} />);
  expect(screen.getByText('3.8')).toBeInTheDocument();
  expect(screen.queryByText(/undefined|NaN|\(.*รีวิว\)/)).not.toBeInTheDocument();
});

test.each([NaN, Infinity, -1, 6])('an invalid score %s is presented as unavailable', rating => {
  mount(<RestaurantCard restaurant={{ ...restaurant, rating }} />);
  expect(screen.getByText('ยังไม่มีคะแนน')).toBeInTheDocument();
  expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
});

test('a missing photo and address use existing local fallbacks', () => {
  mount(<RestaurantCard restaurant={{ ...restaurant, imageUrl: null, address: '' }} />);
  expect(document.querySelector('img')).toHaveAttribute('src', '/images/food-rice.svg');
  expect(screen.getByText('ค้นพบรสชาติประจำถิ่น')).toBeInTheDocument();
});

test('a broken image switches once to the local fallback, including when the fallback also fails', () => {
  mount(<RestaurantCard restaurant={{ ...restaurant, imageUrl: 'https://example.invalid/missing.jpg' }} />);
  const image = document.querySelector('img');
  fireEvent.error(image);
  expect(image).toHaveAttribute('src', '/images/food-rice.svg');
  // Observe src writes rather than assuming that setting onerror=null removes React's listener.
  const setter = jest.spyOn(image, 'src', 'set');
  fireEvent.error(image);
  expect(setter).not.toHaveBeenCalled();
  setter.mockRestore();
});

test('a later photo URL replaces an earlier fallback', () => {
  const view = mount(<RestaurantCard restaurant={{ ...restaurant, imageUrl: null }} />);
  view.rerender(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><RestaurantCard restaurant={restaurant} /></MemoryRouter>);
  expect(document.querySelector('img')).toHaveAttribute('src', '/images/food-noodles.svg');
});

test('the optional action is outside the restaurant link and never navigates when used', () => {
  mount(<RestaurantCard restaurant={restaurant} action={<button type="button">นำออกจากร้านโปรด</button>} />);
  const button = screen.getByRole('button', { name: 'นำออกจากร้านโปรด' });
  expect(button.closest('a')).toBeNull();
  fireEvent.click(button);
  expect(screen.getByLabelText('เส้นทางปัจจุบัน').textContent).toBe('/favorites');
  button.focus();
  expect(button).toHaveFocus();
});

test('the grid is a native list with each action paired to its own restaurant', () => {
  const second = { ...restaurant, id: 502, name: 'ครัวริมสวน' };
  mount(<RestaurantGrid items={[restaurant, second]} renderAction={item => <button type="button">นำออก {item.name}</button>} />);
  const list = screen.getByRole('list', { name: 'รายการร้านอาหาร' });
  expect(list.tagName).toBe('UL');
  const items = within(list).getAllByRole('listitem');
  expect(items).toHaveLength(2);
  expect(within(items[0]).getByRole('link', { name: 'ครัวสายลม', exact: true })).toHaveAttribute('href', '/restaurants/501');
  expect(within(items[0]).getByRole('button', { name: 'นำออก ครัวสายลม' })).toBeInTheDocument();
  expect(within(items[1]).getByRole('button', { name: 'นำออก ครัวริมสวน' })).toBeInTheDocument();
});

test('an empty grid does not create any cards or fake content', () => {
  mount(<RestaurantGrid items={[]} />);
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
