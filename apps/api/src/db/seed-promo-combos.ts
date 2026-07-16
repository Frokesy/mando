import 'dotenv/config'

import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const dollar = String.fromCharCode(36)
const param = (index: number) => dollar + index

const menuItems = [
  ['promo-jollof-rice', 'Promo Jollof Rice', 'One spoon of smoky promo jollof rice.', 650],
  ['promo-fried-rice', 'Promo Fried Rice', 'One spoon of vegetable fried rice.', 700],
  ['peppered-chicken', 'Peppered Chicken', 'One medium peppered chicken piece.', 1100],
  ['jollof-spaghetti', 'Jollof Spaghetti', 'One portion of jollof spaghetti.', 800],
  ['plantain-side', 'Plantain Side', 'One portion of fried plantain.', 450],
  ['takeaway-pack', 'Takeaway Pack', 'One food packaging pack.', 150],
] as const

const combos = [
  {
    slug: 'promo-rice-and-chicken',
    name: 'Promo Rice + Chicken',
    description: 'Two spoons of promo jollof rice with one peppered chicken and takeaway pack.',
    items: [['promo-jollof-rice', 2], ['peppered-chicken', 1], ['takeaway-pack', 1]] as const,
  },
  {
    slug: 'promo-spaghetti-and-plantain',
    name: 'Promo Spaghetti + Plantain',
    description: 'One portion of jollof spaghetti with plantain side and takeaway pack.',
    items: [['jollof-spaghetti', 1], ['plantain-side', 1], ['takeaway-pack', 1]] as const,
  },
]

async function main() {
  const serviceArea = await pool.query(
    'insert into service_areas (name, city, state, is_active) values (' + param(1) + ', ' + param(2) + ', ' + param(3) + ', true) on conflict (lower(name), lower(city), lower(state)) do update set is_active = true, updated_at = now() returning id',
    ['Fashina', 'Ile-Ife', 'Osun'],
  )
  const serviceAreaId = serviceArea.rows[0].id as string

  const restaurant = await pool.query(
    'insert into restaurants (slug, name, description, phone, service_area_id, street_address, preparation_min_minutes, preparation_max_minutes, image_url, status, is_verified, onboarded_at) values (' + param(1) + ', ' + param(2) + ', ' + param(3) + ', ' + param(4) + ', ' + param(5) + ', ' + param(6) + ', 20, 30, ' + param(7) + ', ' + param(8) + ', true, now()) on conflict (slug) do update set name = excluded.name, description = excluded.description, service_area_id = excluded.service_area_id, street_address = excluded.street_address, status = excluded.status, is_verified = true, updated_at = now() returning id',
    ['mjay-lavish', 'Mjay Lavish', 'Promo rice bowls and campus specials', '08000000000', serviceAreaId, '9 Fashina Road', '/restaurant-dummy.png', 'active'],
  )
  const restaurantId = restaurant.rows[0].id as string

  const itemIds = new Map<string, string>()
  for (const [key, name, description, priceAmount] of menuItems) {
    const existing = await pool.query('select id from menu_items where restaurant_id = ' + param(1) + ' and lower(name) = lower(' + param(2) + ') limit 1', [restaurantId, name])
    const item = existing.rowCount
      ? await pool.query('update menu_items set description = ' + param(2) + ', price_amount = ' + param(3) + ', image_url = ' + param(4) + ', is_available = true, updated_at = now() where id = ' + param(1) + ' returning id', [existing.rows[0].id, description, priceAmount, '/test-img-one.png'])
      : await pool.query('insert into menu_items (restaurant_id, name, description, price_amount, image_url, is_available) values (' + param(1) + ', ' + param(2) + ', ' + param(3) + ', ' + param(4) + ', ' + param(5) + ', true) returning id', [restaurantId, name, description, priceAmount, '/test-img-one.png'])

    itemIds.set(key, item.rows[0].id)
  }

  for (const comboSeed of combos) {
    const priceAmount = comboSeed.items.reduce((total, [key, quantity]) => {
      const item = menuItems.find((candidate) => candidate[0] === key)
      if (!item) throw new Error('Missing menu item ' + key)
      return total + item[3] * quantity
    }, 0)

    const combo = await pool.query(
      'insert into combos (restaurant_id, slug, name, description, price_amount, image_url, is_featured, is_available) values (' + param(1) + ', ' + param(2) + ', ' + param(3) + ', ' + param(4) + ', ' + param(5) + ', ' + param(6) + ', true, true) on conflict (restaurant_id, slug) do update set name = excluded.name, description = excluded.description, price_amount = excluded.price_amount, image_url = excluded.image_url, is_featured = true, is_available = true, updated_at = now() returning id',
      [restaurantId, comboSeed.slug, comboSeed.name, comboSeed.description, priceAmount, '/test-img-one.png'],
    )
    const comboId = combo.rows[0].id as string

    await pool.query('delete from combo_items where combo_id = ' + param(1), [comboId])
    for (const [key, quantity] of comboSeed.items) {
      await pool.query('insert into combo_items (combo_id, menu_item_id, quantity, is_optional) values (' + param(1) + ', ' + param(2) + ', ' + param(3) + ', false)', [comboId, itemIds.get(key), quantity])
    }
  }

  console.log(JSON.stringify({ restaurant: 'Mjay Lavish', combos: combos.length }, null, 2))
}

main().finally(() => pool.end())
