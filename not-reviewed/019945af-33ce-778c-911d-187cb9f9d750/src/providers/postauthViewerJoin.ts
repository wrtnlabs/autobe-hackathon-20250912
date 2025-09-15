import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Viewer join (registration) operation.
 *
 * Allows a new viewer to register by providing name, email, and password.
 * Validates the uniqueness of email, hashes the password securely, and creates
 * a new viewer record. Generates JWT access and refresh tokens with expiry
 * timestamps.
 *
 * @param props - Object containing viewer payload and registration data.
 * @param props.viewer - The viewer making the request (not required for join
 *   but included by signature).
 * @param props.body - Registration data including name, email, and password.
 * @returns Authorized viewer object containing id and JWT tokens.
 * @throws {Error} When the email is already registered.
 */
export async function postauthViewerJoin(props: {
  viewer: ViewerPayload;
  body: IFlexOfficeViewer.ICreate;
}): Promise<IFlexOfficeViewer.IAuthorized> {
  const { body } = props;

  // Check for duplicate email
  const existing = await MyGlobal.prisma.flex_office_viewers.findFirst({
    where: { email: body.email, deleted_at: null },
  });
  if (existing) throw new Error("Email already registered");

  // Hash password
  const passwordHash = await MyGlobal.password.hash(body.password);

  // Generate UUID for new viewer
  const newId = v4() as string & tags.Format<"uuid">;

  // Generate timestamps
  const now = toISOStringSafe(new Date());

  // Create new viewer
  const created = await MyGlobal.prisma.flex_office_viewers.create({
    data: {
      id: newId,
      name: body.name,
      email: body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Generate tokens
  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
      type: "viewer",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
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

  // Calculate expiration dates as ISO strings
  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  return {
    id: created.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
