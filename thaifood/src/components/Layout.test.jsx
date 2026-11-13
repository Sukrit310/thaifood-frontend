import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './Layout';
import { AuthProvider } from '../auth/AuthContext';
import { authService } from '../api/services';
import { getToken, setToken } from '../api/backend';
import { resetMockData } from '../mock/server';

let desktop;
let viewportListeners;

function PageContent() {
  const location = useLocation();
  return <><h1>เนื้อหาสำหรับทดสอบ Layout</h1><output aria-label="เส้นทางปัจจุบัน">{location.pathname + location.search}</output><Link to="/restaurants?province=เชียงใหม่">เปลี่ยนจังหวัดในหน้าเดิม</Link></>;
}

async function openLayout(email, entry = '/') {
  if (email) {
    const response = await authService.login({ email, password: 'ExamplePassword123' });
    setToken(response.token);
  }
  render(<MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AuthProvider><Routes><Route element={<Layout />}><Route path="*" element={<PageContent />} /></Route></Routes></AuthProvider></MemoryRouter>);
  const header = screen.getByRole('banner');
  if (email) await within(header).findByRole('link', { name: /โปรไฟล์/ });
  return { header, footer: screen.getByRole('contentinfo') };
}

const toggle = () => within(screen.getByRole('banner')).getByRole('button', { name: /เมนู/ });

beforeEach(() => {
  resetMockData();
  setToken(null);
  window.scrollTo = jest.fn();
  desktop = false;
  viewportListeners = new Set();
  window.matchMedia = jest.fn(() => ({
    get matches() { return desktop; },
    media: '(min-width: 1024px)',
    addEventListener: (type, listener) => viewportListeners.add(listener),
    removeEventListener: (type, listener) => viewportListeners.delete(listener),
  }));
});

afterEach(() => { setToken(null); });

test.each([
  ['guest', null, false, false],
  ['member', 'demo@example.com', true, false],
  ['admin', 'admin@example.com', true, true],
])('%s gets the correct header and footer destinations', async (role, email, signedIn, admin) => {
  const { header, footer } = await openLayout(email);
  const mainNav = within(header).getByRole('navigation', { name: 'เมนูหลัก' });
  const footerNav = within(footer).getByRole('navigation', { name: 'เมนูท้ายเว็บ' });
  const footerAccount = within(footer).getByRole('navigation', { name: 'บัญชีผู้ใช้ในท้ายเว็บ' });
  for (const nav of [mainNav, footerNav]) {
    expect(within(nav).getByRole('link', { name: 'หน้าแรก', exact: true })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'ค้นหาร้านอาหาร', exact: true })).toHaveAttribute('href', '/restaurants');
    expect(Boolean(within(nav).queryByRole('link', { name: 'ร้านโปรด', exact: true }))).toBe(signedIn);
  }
  for (const area of [header, footerAccount]) {
    expect(Boolean(within(area).queryByRole('link', { name: 'จัดการระบบ', exact: true }))).toBe(admin);
    expect(Boolean(within(area).queryByRole('link', { name: /โปรไฟล์/ }))).toBe(signedIn);
    expect(Boolean(within(area).queryByRole('link', { name: 'เข้าสู่ระบบ', exact: true }))).toBe(!signedIn);
    expect(Boolean(within(area).queryByRole('link', { name: /สมัครสมาชิก/ }))).toBe(!signedIn);
  }
});

test('the disclosure controls both navigation and account actions', async () => {
  const { header } = await openLayout();
  const button = toggle();
  expect(button).toHaveAttribute('type', 'button');
  expect(button).toHaveAttribute('aria-expanded', 'false');
  const controlled = document.getElementById(button.getAttribute('aria-controls'));
  expect(controlled).toContainElement(within(header).getByRole('navigation', { name: 'เมนูหลัก' }));
  expect(controlled).toContainElement(within(header).getByRole('link', { name: 'เข้าสู่ระบบ', exact: true }));
  fireEvent.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('Escape closes the mobile menu and returns keyboard focus to its toggle', async () => {
  const { header } = await openLayout();
  fireEvent.click(toggle());
  within(header).getByRole('link', { name: 'ค้นหาร้านอาหาร', exact: true }).focus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  expect(toggle()).toHaveFocus();
});

test('an outside pointer closes the disclosure while pointers inside keep it open', async () => {
  const { header } = await openLayout();
  fireEvent.click(toggle());
  fireEvent.pointerDown(within(header).getByRole('navigation', { name: 'เมนูหลัก' }));
  expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  fireEvent.pointerDown(screen.getByRole('main'));
  expect(toggle()).toHaveAttribute('aria-expanded', 'false');
});

test('mobile navigation closes the disclosure and moves focus to main content', async () => {
  const { header } = await openLayout();
  fireEvent.click(toggle());
  const link = within(header).getByRole('link', { name: 'ค้นหาร้านอาหาร', exact: true });
  link.focus();
  fireEvent.click(link);
  await waitFor(() => expect(screen.getByLabelText('เส้นทางปัจจุบัน')).toHaveTextContent('/restaurants'));
  expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByRole('main')).toHaveFocus();
});

test('query-only navigation closes the disclosure without resetting page scroll', async () => {
  await openLayout(null, '/restaurants');
  fireEvent.click(toggle());
  window.scrollTo.mockClear();
  fireEvent.click(screen.getByRole('link', { name: 'เปลี่ยนจังหวัดในหน้าเดิม' }));
  await waitFor(() => expect(screen.getByLabelText('เส้นทางปัจจุบัน')).toHaveTextContent('/restaurants?province=เชียงใหม่'));
  expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  expect(window.scrollTo).not.toHaveBeenCalled();
});

test('selecting the current route also closes the mobile disclosure', async () => {
  const { header } = await openLayout(null, '/restaurants');
  fireEvent.click(toggle());
  fireEvent.click(within(header).getByRole('link', { name: 'ค้นหาร้านอาหาร', exact: true }));
  await waitFor(() => expect(toggle()).toHaveAttribute('aria-expanded', 'false'));
});

test('responsive transitions collapse the disclosure and keep focus on visible header controls', async () => {
  const { header } = await openLayout();
  fireEvent.click(toggle());
  toggle().focus();
  desktop = true;
  fireEvent(window, new Event('resize'));
  act(() => viewportListeners.forEach(listener => listener({ matches: true })));
  await waitFor(() => expect(toggle()).toHaveAttribute('aria-expanded', 'false'));
  const firstLink = within(header).getByRole('link', { name: 'หน้าแรก', exact: true });
  expect(firstLink).toHaveFocus();
  desktop = false;
  act(() => viewportListeners.forEach(listener => listener({ matches: false })));
  await waitFor(() => expect(toggle()).toHaveFocus());
});

test('breakpoint focus transfer survives the browser blurring a control before the media event', async () => {
  const { header } = await openLayout();
  const button = toggle();
  button.focus();
  // CSS visibility changes can blur a control before matchMedia dispatches change.
  button.blur();
  desktop = true;
  act(() => viewportListeners.forEach(listener => listener({ matches: true })));
  const firstLink = within(header).getByRole('link', { name: 'หน้าแรก', exact: true });
  expect(firstLink).toHaveFocus();
  firstLink.blur();
  desktop = false;
  act(() => viewportListeners.forEach(listener => listener({ matches: false })));
  expect(button).toHaveFocus();
});

test('resizing does not steal keyboard focus from content outside the header', async () => {
  const { header } = await openLayout();
  within(header).getByRole('link', { name: 'หน้าแรก', exact: true }).focus();
  const contentLink = screen.getByRole('link', { name: 'เปลี่ยนจังหวัดในหน้าเดิม' });
  contentLink.focus();
  desktop = false;
  act(() => viewportListeners.forEach(listener => listener({ matches: false })));
  expect(contentLink).toHaveFocus();
});

test('the search link stays active on restaurant detail and Home does not', async () => {
  const { header } = await openLayout(null, '/restaurants/101');
  expect(within(header).getByRole('link', { name: 'ค้นหาร้านอาหาร', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(within(header).getByRole('link', { name: 'หน้าแรก', exact: true })).not.toHaveAttribute('aria-current');
});

test('logout removes the session, returns Home and restores guest navigation', async () => {
  const { header } = await openLayout('admin@example.com', '/profile');
  fireEvent.click(within(header).getByRole('button', { name: 'ออกจากระบบ', exact: true }));
  await waitFor(() => expect(screen.getByLabelText('เส้นทางปัจจุบัน').textContent).toBe('/'));
  expect(getToken()).toBeNull();
  expect(within(header).queryByRole('link', { name: 'จัดการระบบ', exact: true })).not.toBeInTheDocument();
  expect(within(header).getByRole('link', { name: 'เข้าสู่ระบบ', exact: true })).toBeInTheDocument();
});

test('the skip destination and explicit demo disclosure remain available', async () => {
  await openLayout();
  expect(screen.getByRole('link', { name: 'ข้ามไปยังเนื้อหา' })).toHaveAttribute('href', '#main-content');
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  expect(screen.getByText('ข้อมูลสาธิต · ร้านอาหารและรีวิวเป็นข้อมูลสมมติสำหรับทดลองใช้งาน')).toBeInTheDocument();
});
