import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { followedNamesAtom } from '../state/atoms';
import { getFollowedNames, followName, unfollowName } from '../api/qortal';

let initStarted = false;

export function useFollowedNames(name: string) {
  const [followedNames, setFollowedNames] = useAtom(followedNamesAtom);

  useEffect(() => {
    if (initStarted) return;
    initStarted = true;
    getFollowedNames().then(names => {
      setFollowedNames(new Set(names));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFollowed = followedNames.has(name);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowed) {
      setFollowedNames(prev => { const next = new Set(prev); next.delete(name); return next; });
      try { await unfollowName(name); } catch {
        setFollowedNames(prev => { const next = new Set(prev); next.add(name); return next; });
      }
    } else {
      setFollowedNames(prev => { const next = new Set(prev); next.add(name); return next; });
      try { await followName(name); } catch {
        setFollowedNames(prev => { const next = new Set(prev); next.delete(name); return next; });
      }
    }
  }, [name, isFollowed, setFollowedNames]);

  return { isFollowed, toggle };
}
