import { useCallback, useEffect, useState } from 'react';
import { restaurantService } from '../../api/services';

export default function useAdminData(loader, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: null });
    Promise.resolve().then(loader).then(data => {
      if (active) setState({ data, loading: false, error: null });
    }).catch(error => { if (active) setState({ data: null, loading: false, error }); });
    return () => { active = false; };
    // Loader dependencies are supplied by the calling page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, revision]);
  return { ...state, reload };
}
export async function listAllRestaurants() {
  const first = await restaurantService.list({ page: 1, limit: 50 });
  let items = first.items;
  for (let page = 2; page <= Math.ceil(first.total / 50); page += 1) {
    const result = await restaurantService.list({ page, limit: 50 });
    items = items.concat(result.items);
  }
  return { items };
}
