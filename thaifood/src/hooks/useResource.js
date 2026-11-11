import { useEffect, useRef, useState, useCallback } from 'react';

// Each request gets its own generation; stale responses never replace newer filters.
export default function useResource(loader, dependencies = []) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let active = true;
    setState(previous => ({ ...previous, loading: true, error: null }));
    Promise.resolve().then(() => loaderRef.current()).then(data => {
      if (active) setState({ data, loading: false, error: null });
    }).catch(error => {
      if (active) setState({ data: null, loading: false, error });
    });
    return () => { active = false; };
    // The caller supplies the primitive keys that identify this resource.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, version]);
  const retry = useCallback(() => setVersion(value => value + 1), []);
  return { ...state, retry };
}
