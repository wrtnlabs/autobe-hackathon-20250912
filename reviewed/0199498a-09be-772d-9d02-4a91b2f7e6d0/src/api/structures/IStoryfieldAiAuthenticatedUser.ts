import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IStoryfieldAiAuthenticatedUser {
  /**
   * Payload for registering a new authenticated user
   * (storyfield_ai_authenticatedusers). All properties must be present and
   * valid according to onboarding policy. No password or local secret
   * accepted. Actor type is enforced as 'authenticatedUser' at onboarding.
   * Email and external_user_id must each be unique. Traceability, compliance
   * and role mapping are business goals.
   */
  export type ICreate = {
    /**
     * External user ID issued by the Spring backend for this authenticated
     * user. This is a unique, immutable identifier mapping to the
     * externally-verified identity. Used for onboarding and audit.
     *
     * Reference: storyfield_ai_authenticatedusers.external_user_id (Prisma
     * schema).
     */
    external_user_id: string;

    /**
     * Unique business email address of the authenticated user. Required to
     * match Spring registration and used as main user notification and
     * session validation field.
     *
     * Reference: storyfield_ai_authenticatedusers.email (Prisma schema).
     */
    email: string;

    /**
     * Fixed literal value: 'authenticatedUser'. Role token for onboarding,
     * non-configurable. Used for role scoping, joining this platform only
     * as an externally-verified, standard member.
     *
     * Reference: storyfield_ai_authenticatedusers.actor_type (Prisma
     * schema).
     */
    actor_type: "authenticatedUser";
  };

  /**
   * Standard response envelope for authorized registration/login/refresh
   * actions. Bundles full user identity (as registered), role,
   * onboarding/audit datetimes, and the current authorization JWT token
   * contract as issued by the business authentication service. Never contains
   * password, secret or locally-credentialed data. Always maps to
   * externally-verified, onboarding-compliant user.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of this authenticated user. Must be standard UUID
     * v4 string. Used for internal linking and business data ownership.
     *
     * Reference: storyfield_ai_authenticatedusers.id (Prisma schema).
     */
    id: string & tags.Format<"uuid">;

    /**
     * External Spring/backend verified user ID. Used for SSO mapping and
     * external audit trace.
     *
     * Reference: storyfield_ai_authenticatedusers.external_user_id (Prisma
     * schema).
     */
    external_user_id: string;

    /**
     * User business-unique email address for notifications and session
     * mapping.
     *
     * Reference: storyfield_ai_authenticatedusers.email (Prisma schema).
     */
    email: string;

    /**
     * Role type, always 'authenticatedUser' here for registration, login,
     * refresh.
     *
     * Reference: storyfield_ai_authenticatedusers.actor_type (Prisma
     * schema).
     */
    actor_type: "authenticatedUser";

    /**
     * Datetime string (ISO 8601) when registration occurred. Used for
     * compliance audit.
     *
     * Reference: storyfield_ai_authenticatedusers.created_at (Prisma
     * schema).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Datetime string (ISO 8601) for latest profile update. Used for
     * traceability and historical rollback.
     *
     * Reference: storyfield_ai_authenticatedusers.updated_at (Prisma
     * schema).
     */
    updated_at: string & tags.Format<"date-time">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Login Request: contract for login of previously-registered
   * authenticatedUser via externally-issued unique ID and business email.
   * Passwords, OOB secrets, or two-factor codes are never accepted in this
   * API; all authentication is federated and controlled solely by business
   * onboarding workflows with SSO tracing. Uniqueness enforced by
   * registration schema.
   */
  export type ILogin = {
    /**
     * External user ID (from Spring/backend). Must match
     * previously-registered, externally-verified user identity. Used for
     * session inception, SSO, audit trail, and credential binding.
     *
     * Reference: storyfield_ai_authenticatedusers.external_user_id (Prisma
     * schema).
     */
    external_user_id: string;

    /**
     * Unique email (as registered in both Spring/backend SSO and local
     * business system). Required to authenticate this user, for session
     * context and compliance mapping. May be rechecked at every login
     * event.
     *
     * Reference: storyfield_ai_authenticatedusers.email (Prisma schema).
     */
    email: string;
  };

  /**
   * Refresh Request: contract for requesting an updated session/JWT for an
   * already-authenticatedUser. Body is always empty; token/refresh context
   * always supplied via Authorization header only. No locally credentialed,
   * personally identifiable, or audit-sensitive input required. Only valid
   * for ongoing, unrevoked sessions as recognized by current JWT logic.
   */
  export type IRefresh = {};
}
