import Keycloak, { type KeycloakConfig } from 'keycloak-js';

import { environment } from '../../../environments/environment';

const keycloakConfig: KeycloakConfig = {
  url: environment.keycloak.url,
  realm: environment.keycloak.realm,
  clientId: environment.keycloak.clientId,
};

export const keycloakClient = new Keycloak(keycloakConfig);
