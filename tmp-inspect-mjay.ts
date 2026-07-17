import { database } from './apps/api/src/db/client.ts'
import { restaurants, restaurantMembers, profiles, users } from './apps/api/src/db/schema.ts'
import { eq, ilike, inArray } from 'drizzle-orm'

async function main() {
  const rows = await database
    .select({
      id: restaurants.id,
      name: restaurants.name,
      slug: restaurants.slug,
      phone: restaurants.phone,
      serviceAreaId: restaurants.serviceAreaId,
    })
    .from(restaurants)
    .where(ilike(restaurants.name, 'mjay lavish'))

  console.log('restaurants', JSON.stringify(rows, null, 2))

  const restaurant = rows[0]
  if (!restaurant) {
    console.log('no restaurant found')
    return
  }

  const members = await database.select().from(restaurantMembers).where(eq(restaurantMembers.restaurantId, restaurant.id))
  console.log('members', JSON.stringify(members, null, 2))

  if (members.length) {
    const userIds = members.map((member) => member.userId)
    const profileRows = await database.select().from(profiles).where(inArray(profiles.userId, userIds))
    const userRows = await database.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, userIds))

    console.log('profiles', JSON.stringify(profileRows, null, 2))
    console.log('users', JSON.stringify(userRows, null, 2))
  }
}

void main()
