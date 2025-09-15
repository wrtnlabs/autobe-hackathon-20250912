import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ISpecialtyCoffeeLogGuest {
  /**
   * Payload to register a new guest user including IP address and optional
   * user agent string.
   */
  export type ICreate = {
    /** IP address of the guest user. */
    ip_address: string;

    /** Optional user agent string from the guest's device. */
    user_agent?: string | null | undefined;
  };

  /** Authorized response with JWT tokens and guest user info. */
  export type IAuthorized = {
    /** Unique identifier of the guest user. */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
