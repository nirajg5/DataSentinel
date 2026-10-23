/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProviders } from './app/providers';
import { AppRoutes } from './app/router';

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
