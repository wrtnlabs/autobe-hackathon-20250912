import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * User login API for end users enabling authentication with email and password.
 * Validates credentials against telegram_file_downloader_endusers data and
 * issues JWT tokens for session management.
 *
 * This endpoint is publicly accessible and allows members to obtain access
 * tokens necessary for subsequent API calls and dashboard interactions.
 *
 * @param props - Object containing the authenticated endUser payload and login
 *   body
 * @param props.endUser - The authenticated end user making the request (ignored
 *   here)
 * @param props.body - The login request body containing email and password
 * @returns Promise resolving to authorized user data with issued tokens
 * @throws {Error} Throws if credentials are invalid
 */
export async function postauthEndUserLogin(props: {
  endUser: EnduserPayload;
  body: ITelegramFileDownloaderEndUser.ILogin;
}): Promise<ITelegramFileDownloaderEndUser.IAuthorized> {
  const { body } = props;

  let user;
  try {
    user =
      await MyGlobal.prisma.telegram_file_downloader_endusers.findFirstOrThrow({
        where: {
          email: body.email,
          deleted_at: null,
        },
      });
  } catch {
    throw new Error("Invalid credentials");
  }

  const isPasswordValid = await MyGlobal.password.verify(
    body.password,
    user.password_hash,
  );
  if (!isPasswordValid) throw new Error("Invalid credentials");

  typia.assertGuard<string & tags.Format<"email">>(user.email);

  const accessToken = jwt.sign(
    {
      id: user.id,
      type: "enduser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: "enduser",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
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
