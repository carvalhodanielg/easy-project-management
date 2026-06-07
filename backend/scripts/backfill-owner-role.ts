/**
 * One-off migration for GAPS #5 (RBAC owner role).
 *
 * Spaces created before the owner role existed have their creator stored as an
 * `editor` SpaceMember. This script promotes each space's creator (`createdBy`)
 * to `owner`. It is idempotent — running it again is a no-op.
 *
 * Usage:
 *   MONGODB_URI=mongodb://localhost:27017/atkplan npx ts-node scripts/backfill-owner-role.ts
 *   # or, against the compiled output:
 *   node dist/scripts/backfill-owner-role.js
 */
import mongoose from 'mongoose';

async function run(): Promise<void> {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/atkplan';
  await mongoose.connect(uri);
  console.log(`Connected to ${uri}`);

  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle after connecting');

  const spaces = db.collection('spaces');
  const members = db.collection('spacemembers');

  let promoted = 0;
  const cursor = spaces.find({}, { projection: { _id: 1, createdBy: 1 } });

  for await (const space of cursor) {
    if (!space.createdBy) continue;

    const res = await members.updateOne(
      { spaceId: space._id, userId: space.createdBy, role: { $ne: 'owner' } },
      { $set: { role: 'owner' } },
    );
    if (res.modifiedCount > 0) promoted += 1;
  }

  console.log(`Done. Promoted ${promoted} space creator(s) to owner.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
