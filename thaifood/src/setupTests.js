// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Unit tests use isolated fixtures; the application defaults to the deployed Go API.
process.env.REACT_APP_USE_MOCK = 'true';
