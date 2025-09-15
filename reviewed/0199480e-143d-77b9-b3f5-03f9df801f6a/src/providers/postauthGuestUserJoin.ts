import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ILibraryManagementGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementGuestUser";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

/**
 * Register a new guest user (unauthenticated) by creating a temporary identity
 * record to support library management guest features like adding, viewing, and
 * searching books.
 *
 * This join operation is public and issues temporary authorization tokens. It
 * works against the library_management_guestusers table, creating a record with
 * a unique ID and timestamps for creation and updates. No credentials or active
 * login are required.
 *
 * @param props - Contains guestUser payload information (not used internally in
 *   this operation)
 * @returns The authorized guest user identity along with JWT tokens for session
 *   continuity.
 * @throws Will throw if database creation fails or JWT signing encounters an
 *   error.
 */
export async function postauthGuestUserJoin(props: {
  guestUser: GuestuserPayload;
}): Promise<ILibraryManagementGuestUser.IAuthorized> {
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.library_management_guestusers.create({
    data: {
      id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const accessToken = jwt.sign(
    {
      userId: id,
      type: "guestUser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ),
    },
  };
}
