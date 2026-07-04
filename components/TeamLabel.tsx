'use client';

import { teamNamePt } from '@/lib/teamNames';
import { Team } from '@/lib/types';

export default function TeamLabel({
  team, placeholder, side,
}: {
  team: Team | null | undefined;
  placeholder?: string;
  side: 'home' | 'away';
}) {
  const flag = team?.crest
    ? <img src={team.crest} alt="" loading="lazy" />
    : null;
  const name = team?.name
    ? <span className="name">{teamNamePt(team.name)}</span>
    : <span className="name placeholder">{placeholder ?? 'A definir'}</span>;

  return (
    <span className={`team ${side}`}>
      {side === 'home' ? <>{name}{flag}</> : <>{flag}{name}</>}
    </span>
  );
}
