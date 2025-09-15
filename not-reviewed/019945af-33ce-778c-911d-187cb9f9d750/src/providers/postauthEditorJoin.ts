import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Registration endpoint for FlexOffice Editor users.
 *
 * This operation creates a new editor user account with the given name, email,
 * and password. Password is hashed securely before storage. Ensures unique
 * email constraint is enforced. Returns JWT access and refresh tokens for the
 * new user session.
 *
 * @param props - Input properties including the editor (auth not required for
 *   join) and registration data
 * @param props.editor - The editor auth payload (not used in join but part of
 *   API contract)
 * @param props.body - The registration data for the new editor user
 * @returns Authorized user session tokens with user id and JWT info
 * @throws {Error} When password is missing or too weak
 * @throws {Error} When email already exists
 */
export async function postauthEditorJoin(props: {
  editor: EditorPayload;
  body: IFlexOfficeEditor.ICreate;
}): Promise<IFlexOfficeEditor.IAuthorized> {
  const { body } = props;

  // Validate password
  if (!body.password || body.password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  // Check duplicate email
  const existing = await MyGlobal.prisma.flex_office_editors.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new Error("Email already exists");
  }

  // Hash password
  const hashed = await MyGlobal.password.hash(body.password);

  // Generate new UUID for editor id
  const newId = v4() as unknown as string & tags.Format<"uuid">;

  // Create editor
  const created = await MyGlobal.prisma.flex_office_editors.create({
    data: {
      id: newId,
      name: body.name,
      email: body.email,
      password_hash: hashed,
    },
  });

  // Prepare token expiration strings
  const expired_at = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  // Generate tokens
  const access = jwt.sign(
    {
      id: created.id,
      email: created.email,
      type: "editor",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized session
  return {
    id: created.id,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
