import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Authenticate existing Editor user and issue authorization tokens.
 *
 * This function validates the editor's credentials against the
 * flex_office_editors table. Upon successful authentication, it generates JWT
 * access and refresh tokens with appropriate expiration.
 *
 * @param props - Object containing editor payload and login credentials.
 * @param props.editor - Authenticated editor payload (not used in login logic,
 *   included as per definition).
 * @param props.body - Login credentials containing email and password.
 * @returns The authorized editor information including JWT tokens.
 * @throws {Error} When email is not found or password is invalid.
 */
export async function postauthEditorLogin(props: {
  editor: EditorPayload;
  body: IFlexOfficeEditor.ILogin;
}): Promise<IFlexOfficeEditor.IAuthorized> {
  const { body } = props;

  // Find editor by email and not soft-deleted
  const editor = await MyGlobal.prisma.flex_office_editors.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (editor === null) {
    throw new Error("Invalid credentials");
  }

  // Verify password correctness
  const isPasswordValid = await MyGlobal.password.verify(
    body.password,
    editor.password_hash,
  );
  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  // Define timestamps using toISOStringSafe with Date offset
  const now = Date.now();
  const expiredAt = toISOStringSafe(new Date(now + 60 * 60 * 1000)); // 1 hour
  const refreshableUntil = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  const token: IAuthorizationToken = {
    access: jwt.sign(
      { id: editor.id, type: "editor" },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      { id: editor.id, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };

  return {
    id: editor.id,
    token,
  };
}
