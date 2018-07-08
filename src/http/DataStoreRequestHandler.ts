import * as http from 'http';

import HttpError from 'standard-http-error';

import PermissionSet from '../auth/PermissionSet';
import MethodExtractor from './MethodExtractor';
import RequestBody from './RequestBody';
import RequestBodyParser from './RequestBodyParser';
import TargetExtractor from './TargetExtractor';

/**
 * Handles an HTTP request for the data store.
 */
export default class DataStoreRequestHandler {
  protected methodExtractor: MethodExtractor;
  protected targetExtractor: TargetExtractor;
  protected bodyParsers: RequestBodyParser[];

  constructor({ methodExtractor, targetExtractor, bodyParsers = [] }:
              { methodExtractor: MethodExtractor, targetExtractor: TargetExtractor,
                bodyParsers?: RequestBodyParser[] }) {
    this.methodExtractor = methodExtractor;
    this.targetExtractor = targetExtractor;
    this.bodyParsers = bodyParsers;
  }

  /**
   * Handles an HTTP request.
   *
   * @param request  - The HTTP request
   * @param response - The HTTP response
   * @param next     - An error callback
   */
  public handleRequest(request: http.IncomingMessage, response: http.ServerResponse,
                       next: (error: Error) => void) {
    this._handleRequest(request, response).catch(next);
  }

  /**
   * Handles an HTTP request.
   *
   * @param request  - The HTTP request
   * @param response - The HTTP response
   */
  protected async _handleRequest(request: http.IncomingMessage, response: http.ServerResponse) {
    // Extract and validate the method
    const method = this.methodExtractor.extract(request);
    if (!METHOD_PERMISSIONS.hasOwnProperty(method)) {
      throw new HttpError(HttpError.METHOD_NOT_ALLOWED);
    }

    // Determine the required permissions based on the method or request body
    let requiredPermissions: PermissionSet;
    let requestBody: RequestBody | undefined;
    if (!PERMISSIONS_IN_BODY[method]) {
      // The method fully determines the permissions
      requiredPermissions = METHOD_PERMISSIONS[method].clone();
    } else {
      // Determine the permissions by parsing the body
      const bodyParser = this.bodyParsers.find(p => p.supports(request.headers));
      if (!bodyParser) {
        throw new HttpError(HttpError.UNSUPPORTED_MEDIA_TYPE);
      }
      try {
        requestBody = await bodyParser.parse(request, request.headers);
      } catch (cause) {
        throw new HttpError(HttpError.BAD_REQUEST, { cause });
      }
      requiredPermissions = requestBody.requiredPermissions;
    }

    // Extract and validate the target
    let target;
    try {
      target = this.targetExtractor.extract(request);
    } catch (cause) {
      throw new HttpError(HttpError.BAD_REQUEST, { cause });
    }

    // Generate a response
    response.end(JSON.stringify({ method, requiredPermissions, target }));
  }
}

// Common permission sets
const READ_ONLY = new PermissionSet({ read: true });
const WRITE_ONLY = new PermissionSet({ write: true });
const APPEND_ONLY = new PermissionSet({ append: true });
const READ_WRITE = new PermissionSet({ read: true, write: true });

// Required permissions per HTTP method
const METHOD_PERMISSIONS: { [key: string]: PermissionSet } = {
  GET: READ_ONLY,
  HEAD: READ_ONLY,
  OPTIONS: READ_ONLY,
  POST: APPEND_ONLY,
  PUT: WRITE_ONLY,
  DELETE: WRITE_ONLY,
  PATCH: READ_WRITE,
};

// Methods that require parsing the request body in order to determine permissions
const PERMISSIONS_IN_BODY: { [key: string]: boolean } = {
  PATCH: true,
};
