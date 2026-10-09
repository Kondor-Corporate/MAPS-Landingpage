/**
 * Registro central de escenas: mapea cada SceneId (de theme/timings.ts) a su
 * componente. Usado por la composición principal y por Root para registrar cada
 * escena individualmente en Studio.
 */
import type { SceneId } from '../theme/timings';
import { Scene01Intro } from './Scene01Intro';
import { Scene02Hero } from './Scene02Hero';
import { Scene03Map } from './Scene03Map';
import { Scene04Producer } from './Scene04Producer';
import { Scene05News } from './Scene05News';
import { Scene06Transition } from './Scene06Transition';
import { Scene07Dashboard } from './Scene07Dashboard';
import { Scene08Library } from './Scene08Library';
import { Scene09ProducerPortal } from './Scene09ProducerPortal';
import { Scene10Outro } from './Scene10Outro';

export const sceneRegistry: Record<SceneId, React.FC> = {
  Scene01Intro,
  Scene02Hero,
  Scene03Map,
  Scene04Producer,
  Scene05News,
  Scene06Transition,
  Scene07Dashboard,
  Scene08Library,
  Scene09ProducerPortal,
  Scene10Outro,
};
