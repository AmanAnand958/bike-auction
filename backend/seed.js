const db = require('./db');
const bcrypt = require('bcrypt');

async function seed() {
  console.log('Starting database seeding...');

  try {
    console.log('Cleaning existing tables...');
    await db.query('TRUNCATE TABLE bids, auction_images, auctions, users RESTART IDENTITY CASCADE;');

    console.log('Hashing passwords...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const userPasswordHash = await bcrypt.hash('user123', 10);

    console.log('Inserting users...');
    const usersResult = await db.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES 
        ('Admin User', 'admin@bikeauction.com', $1, 'admin'),
        ('Rohit Sharma', 'rohit@gmail.com', $2, 'user'),
        ('Priya Patel', 'priya@gmail.com', $2, 'user'),
        ('Amit Kumar', 'amit@gmail.com', $2, 'user')
      RETURNING id, name, email, role;
    `, [adminPasswordHash, userPasswordHash]);

    const users = usersResult.rows;
    const admin = users.find(u => u.role === 'admin');
    const rohit = users.find(u => u.email === 'rohit@gmail.com');
    const priya = users.find(u => u.email === 'priya@gmail.com');
    const amit = users.find(u => u.email === 'amit@gmail.com');

    console.log(`Seeded users: Admin (ID: ${admin.id}), Rohit (ID: ${rohit.id}), Priya (ID: ${priya.id}), Amit (ID: ${amit.id})`);

    console.log('Inserting auctions...');
    const now = new Date();
    
    const oneDay = 24 * 60 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    const auctionsData = [
      {
        title: '2021 Royal Enfield Classic 350 Chrome Bronze',
        year: 2021,
        make: 'Royal Enfield',
        model: 'Classic 350',
        mileage: 12000,
        condition: 'excellent',
        description: 'Meticulously maintained Royal Enfield Classic 350 in Chrome Bronze. Single owner, complete service history at authorized dealership, zero accidents. Fitted with custom crash guards and touring seats. Runs perfectly.',
        starting_bid: 150000.00,
        current_bid: 165000.00,
        status: 'active',
        start_time: new Date(now.getTime() - oneDay),
        end_time: new Date(now.getTime() + 2 * oneDay),
        winner_id: null,
        created_by: admin.id,
        images: [
          'https://images.unsplash.com/photo-1695662057393-277cb70bc298?w=800&q=80'
        ]
      },
      {
        title: '2022 KTM RC 390 Factory Edition',
        year: 2022,
        make: 'KTM',
        model: 'RC 390',
        mileage: 8500,
        condition: 'excellent',
        description: 'Track-ready KTM RC 390 with premium updates. Features Metzeler Sportec tires, adjustable levers, and a clean tail tidy. Exclusively serviced at KTM service center with Motul full-synthetic oils.',
        starting_bid: 220000.00,
        current_bid: 235000.00,
        status: 'active',
        start_time: new Date(now.getTime() - 6 * oneHour),
        end_time: new Date(now.getTime() + 18 * oneHour),
        winner_id: null,
        created_by: admin.id,
        images: [
          'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&q=80',
          'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80'
        ]
      },
      {
        title: '2020 Yamaha YZF-R15 V3 Racing Blue',
        year: 2020,
        make: 'Yamaha',
        model: 'YZF-R15 V3',
        mileage: 16200,
        condition: 'good',
        description: 'Stylish and fuel-efficient Yamaha R15 V3 in Racing Blue. Equipped with dual-channel ABS, LED headlights, and slipper clutch. Minor scuff mark on the right panel, otherwise in pristine mechanical order.',
        starting_bid: 110000.00,
        current_bid: null,
        status: 'upcoming',
        start_time: new Date(now.getTime() + oneDay),
        end_time: new Date(now.getTime() + 3 * oneDay),
        winner_id: null,
        created_by: admin.id,
        images: [
          'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80'
        ]
      },
      {
        title: '2022 Honda H\'ness CB350 Anniversary Edition',
        year: 2022,
        make: 'Honda',
        model: 'H\'ness CB350',
        mileage: 4800,
        condition: 'excellent',
        description: 'Cruiser beauty in dual-tone green and gold. Barely ridden, zero scratches. Fitted with Honda genuine touring screen, backrest, and pannier mounts. Delhi registration, active comprehensive insurance.',
        starting_bid: 160000.00,
        current_bid: 180000.00,
        status: 'ended',
        start_time: new Date(now.getTime() - 3 * oneDay),
        end_time: new Date(now.getTime() - oneHour),
        winner_id: rohit.id,
        created_by: admin.id,
        images: [
          'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=800&q=80'
        ]
      },
      {
        title: '2019 Bajaj Pulsar NS200 Fi ABS',
        year: 2019,
        make: 'Bajaj',
        model: 'Pulsar NS200',
        mileage: 24000,
        condition: 'fair',
        description: 'Fi variant with single-channel ABS. Ideal for college students or daily commuters looking for great acceleration. New front-rear chain sprocket kit and new battery installed recently.',
        starting_bid: 80000.00,
        current_bid: 85000.00,
        status: 'active',
        start_time: new Date(now.getTime() - 12 * oneHour),
        end_time: new Date(now.getTime() + 12 * oneHour),
        winner_id: null,
        created_by: admin.id,
        images: [
          'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80'
        ]
      },
      {
        title: '2021 TVS Apache RTR 200 4V',
        year: 2021,
        make: 'TVS',
        model: 'Apache RTR 200 4V',
        mileage: 11500,
        condition: 'good',
        description: 'Equipped with SmartXonnect system for navigation & telemetry, adjustable front suspension, and riding modes. Excellent control and response. Ended with no bids received.',
        starting_bid: 95000.00,
        current_bid: null,
        status: 'ended',
        start_time: new Date(now.getTime() - 5 * oneDay),
        end_time: new Date(now.getTime() - 2 * oneDay),
        winner_id: null,
        created_by: admin.id,
        images: [
          'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80'
        ]
      }
    ];

    const seededAuctions = [];

    for (const a of auctionsData) {
      const res = await db.query(`
        INSERT INTO auctions 
          (title, year, make, model, mileage, condition, description, starting_bid, current_bid, status, start_time, end_time, winner_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
      `, [
        a.title, a.year, a.make, a.model, a.mileage, a.condition, a.description,
        a.starting_bid, a.current_bid, a.status, a.start_time, a.end_time, a.winner_id, a.created_by
      ]);

      const auction = res.rows[0];
      seededAuctions.push(auction);

      for (let i = 0; i < a.images.length; i++) {
        await db.query(`
          INSERT INTO auction_images (auction_id, url, display_order)
          VALUES ($1, $2, $3);
        `, [auction.id, a.images[i], i]);
      }
    }

    console.log(`Seeded ${seededAuctions.length} auctions successfully!`);

    console.log('Inserting bids history...');
    
    const reAuction = seededAuctions.find(a => a.title.includes('Royal Enfield'));
    const ktmAuction = seededAuctions.find(a => a.title.includes('KTM'));
    const hondaAuction = seededAuctions.find(a => a.title.includes('Honda'));
    const pulsarAuction = seededAuctions.find(a => a.title.includes('Pulsar'));

    await db.query(`
      INSERT INTO bids (auction_id, user_id, amount, created_at)
      VALUES 
        ($1, $2, 155000.00, $4),
        ($1, $3, 160000.00, $5),
        ($1, $2, 165000.00, $6)
    `, [reAuction.id, rohit.id, priya.id, new Date(now.getTime() - 20 * oneHour), new Date(now.getTime() - 15 * oneHour), new Date(now.getTime() - 10 * oneHour)]);

    await db.query(`
      INSERT INTO bids (auction_id, user_id, amount, created_at)
      VALUES 
        ($1, $2, 225000.00, $4),
        ($1, $3, 230000.00, $5),
        ($1, $2, 235000.00, $6)
    `, [ktmAuction.id, priya.id, amit.id, new Date(now.getTime() - 5 * oneHour), new Date(now.getTime() - 4 * oneHour), new Date(now.getTime() - 3 * oneHour)]);

    await db.query(`
      INSERT INTO bids (auction_id, user_id, amount, created_at)
      VALUES 
        ($1, $2, 165000.00, $4),
        ($1, $3, 170000.00, $5),
        ($1, $2, 175000.00, $6),
        ($1, $3, 180000.00, $7)
    `, [
      hondaAuction.id, amit.id, rohit.id,
      new Date(now.getTime() - 2 * oneDay),
      new Date(now.getTime() - 1.5 * oneDay),
      new Date(now.getTime() - 1 * oneDay),
      new Date(now.getTime() - 2 * oneHour)
    ]);

    await db.query(`
      INSERT INTO bids (auction_id, user_id, amount, created_at)
      VALUES 
        ($1, $2, 85000.00, $3)
    `, [pulsarAuction.id, priya.id, new Date(now.getTime() - 8 * oneHour)]);

    console.log('Seeded bids successfully!');
    console.log('Database seeding finished successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await db.end();
  }
}

seed();
