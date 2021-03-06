import LdpOperation from './LdpOperation';
import ResourceStore from '../ResourceStore';
import ResourceIdentifier from '../ResourceIdentifier';
import Representation from '../Representation';
import PermissionSet from '../../permissions/PermissionSet';

/**
 * Performs an LDP PUT operation.
 */
export default class PutOperation extends LdpOperation {
  constructor(settings :
              { store: ResourceStore,
                target: ResourceIdentifier,
                body: Representation }) {
    super(settings);
  }

  get acceptsBody(): boolean { return true; }

  get requiredPermissions(): PermissionSet { return PermissionSet.WRITE_ONLY; }

  async performModification(): Promise<ResourceIdentifier> {
    await this.store.setRepresentation(this.target, this.body as Representation);
    return this.target;
  }
}
