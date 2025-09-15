import { tags } from "typia";

export namespace IOauthServerUserProfiles {
  /** Filter and pagination request for user profiles. */
  export type IRequest = {
    /**
     * Page number for paginated results.
     *
     * Nullable for default first page.
     */
    page?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Record limit per page for pagination.
     *
     * Nullable for default limit.
     */
    limit?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * Nickname to filter user profiles by.
     *
     * Nullable to allow no filtering.
     */
    nickname?: string | null | undefined;

    /**
     * Filter by specific user ID.
     *
     * Nullable for no filtering.
     */
    user_id?: (string & tags.Format<"uuid">) | null | undefined;
  };

  /**
   * Summary information for user profiles capturing frequently changing
   * display info.
   */
  export type ISummary = {
    /** Unique identifier of the user profile record */
    id: string & tags.Format<"uuid">;

    /** User ID this profile belongs to */
    user_id: string & tags.Format<"uuid">;

    /** User's display nickname; nullable */
    nickname?: string | null | undefined;

    /** URL of user's profile picture; nullable */
    profile_picture_url?: string | null | undefined;

    /** User's biography information; nullable */
    biography?: string | null | undefined;

    /** Timestamp when the user profile was created */
    created_at: string & tags.Format<"date-time">;

    /** Timestamp when the user profile was last updated */
    updated_at: string & tags.Format<"date-time">;

    /** Soft delete timestamp for the user profile; null if active */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
