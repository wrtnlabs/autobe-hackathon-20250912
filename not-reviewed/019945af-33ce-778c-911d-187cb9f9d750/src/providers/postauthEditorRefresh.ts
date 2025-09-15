import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Refresh JWT tokens for Editor user sessions with valid refresh token.
 *
 * The /auth/editor/refresh endpoint allows Editor users to renew their access
 * tokens using a valid refresh token. It validates the token, checks user
 * existence, and issues fresh JWT access and refresh tokens.
 *
 * @param props - Object containing authenticated editor and request body
 * @param props.editor - Authenticated editor payload
 * @param props.body - Request body containing the refresh_token string
 * @returns Object containing editor id and new authorization tokens
 * @throws {Error} When the refresh token is invalid
 * @throws {Error} When token payload is invalid
 * @throws {Error} When the editor user does not exist or has been deleted
 */
export async function postauthEditorRefresh(props: {
  editor: EditorPayload;
  body: IFlexOfficeEditor.IRefresh;
}): Promise<IFlexOfficeEditor.IAuthorized> {
  const { body } = props;

  let decoded;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid refresh token");
  }

  if (
    !decoded ||
    typeof decoded !== "object" ||
    decoded.type !== "editor" ||
    typeof decoded.id !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  const editor = await MyGlobal.prisma.flex_office_editors.findFirst({
    where: {
      id: decoded.id,
      deleted_at: null,
    },
  });

  if (!editor) {
    throw new Error("Editor not found or deleted");
  }

  const expiredAt = toISOStringSafe(new Date(Date.now() + 1000 * 60 * 60)); // 1 hour
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  ); // 7 days

  const accessToken = jwt.sign(
    { id: decoded.id, type: "editor" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    { id: decoded.id, type: "editor" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: editor.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
