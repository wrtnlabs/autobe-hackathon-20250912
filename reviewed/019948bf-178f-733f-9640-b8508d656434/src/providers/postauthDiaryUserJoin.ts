import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IMoodDiaryDiaryUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMoodDiaryDiaryUser";
import { DiaryuserPayload } from "../decorators/payload/DiaryuserPayload";

/**
 * Obtain session token as the logical diaryUser (single-user, from
 * mood_diary_diaryusers), no registration or authentication required.
 *
 * This operation issues a short-lived access token and token metadata for the
 * application's single logical diary user. No registration, credentials, or
 * user input is ever required; this is stateless, non-personalized access, with
 * no sensitive data. Token includes only id and role discriminator (type), with
 * correct expiry fields.
 *
 * @returns Authorized session object for the one logical diary user, with JWT
 *   token info and user id/created_at.
 * @throws {Error} If the system's logical diary user does not exist in the
 *   database (system setup error).
 */
export async function postauthDiaryUserJoin(): Promise<IMoodDiaryDiaryUser.IAuthorized> {
  // Fetch the single logical diary user; must always exist (1-user system)
  const user = await MyGlobal.prisma.mood_diary_diaryusers.findFirst();
  if (!user) {
    throw new Error(
      "The logical diary user does not exist in the system database.",
    );
  }

  // Timestamps: always use string & tags.Format<'date-time'>
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Calculate expiries using string timestamps
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.parse(now) + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.parse(now) + 7 * 24 * 60 * 60 * 1000),
  );

  // JWT: diary user payload as per DiaryuserPayload definition
  const tokenPayload = {
    id: user.id,
    type: "diaryUser",
  };

  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  return {
    id: user.id,
    created_at: toISOStringSafe(user.created_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
