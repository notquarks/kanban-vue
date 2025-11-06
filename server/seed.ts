import 'dotenv/config';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import bcrypt from 'bcryptjs';
import {
  usersTable,
  teamsTable,
  usersToTeamsTable,
  projectsTable,
  kanbanBoardsTable,
  kanbanColumnsTable,
  kanbanCardsTable,
  prioritiesTable,
  labelsTable,
  cardsToLabelsTable,
  attachmentsTable,
  commentsTable
} from './db/schema';

const dbFileName = process.env.DB_FILE_NAME || 'kanban.db';
const sqlite = new Database(dbFileName);
const db = drizzle({ client: sqlite });

async function seed() {
  console.log('🌱 Starting database seeding...');

  // Hash passwords for seed users
  const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 12);
  };

  const priorities = await db.insert(prioritiesTable).values([
    { name: 'Low', level: 0, color: '#22c55e' },
    { name: 'Medium', level: 1, color: '#f59e0b' },
    { name: 'High', level: 2, color: '#ef4444' },
    { name: 'Urgent', level: 3, color: '#dc2626' }
  ]).returning();

  const labels = await db.insert(labelsTable).values([
    { name: 'Bug', color: '#ef4444' },
    { name: 'Feature', color: '#3b82f6' },
    { name: 'Enhancement', color: '#10b981' },
    { name: 'Documentation', color: '#f59e0b' },
    { name: 'Testing', color: '#8b5cf6' },
    { name: 'Design', color: '#ec4899' },
    { name: 'Backend', color: '#06b6d4' },
    { name: 'Frontend', color: '#f97316' }
  ]).returning();

  // Create users with properly hashed passwords
  const adminPasswordHash = await hashPassword('admin123');
  const userPasswordHash = await hashPassword('user123');

  const users = await db.insert(usersTable).values([
    { name: 'Alice Johnson', email: 'alice@kanban.com', passwordHash: adminPasswordHash, isAdmin: true, status: 'active' },
    { name: 'Bob Smith', email: 'bob@kanban.com', passwordHash: userPasswordHash, isAdmin: false, status: 'active' },
    { name: 'Carol Davis', email: 'carol@kanban.com', passwordHash: userPasswordHash, isAdmin: false, status: 'active' },
    { name: 'David Wilson', email: 'david@kanban.com', passwordHash: userPasswordHash, isAdmin: false, status: 'active' },
    { name: 'Emma Brown', email: 'emma@kanban.com', passwordHash: userPasswordHash, isAdmin: false, status: 'active' }
  ]).returning();

  console.log('👥 Users created with password hashes');
  console.log('   Admin user: alice@kanban.com / admin123');
  console.log('   Regular users: bob@kanban.com / user123');


  const teams = await db.insert(teamsTable).values([
    { name: 'Engineering', description: 'Software development and infrastructure team' },
    { name: 'Design', description: 'UI/UX design and frontend creativity' },
    { name: 'Product', description: 'Product management and strategy team' },
    { name: 'Marketing', description: 'Marketing and growth team' }
  ]).returning();


  await db.insert(usersToTeamsTable).values([
    { userId: users[0].id, teamId: teams[0].id },
    { userId: users[1].id, teamId: teams[0].id },
    { userId: users[2].id, teamId: teams[1].id },
    { userId: users[3].id, teamId: teams[2].id },
    { userId: users[4].id, teamId: teams[0].id },
    { userId: users[4].id, teamId: teams[1].id }
  ]);

  const projects = await db.insert(projectsTable).values([
    { name: 'Mobile App Redesign', description: 'Complete redesign of the mobile application with modern UI/UX', ownerId: users[0].id, teamId: teams[0].id, status: 'active', startDate: new Date('2024-01-01') },
    { name: 'E-commerce Platform', description: 'Build new e-commerce platform from scratch with modern tech stack', ownerId: users[2].id, teamId: teams[1].id, status: 'planning', startDate: new Date('2024-02-01') },
    { name: 'Marketing Campaign Q3', description: 'Q3 marketing campaign execution across multiple channels', ownerId: users[3].id, teamId: teams[3].id, status: 'active', startDate: new Date('2024-07-01') },
    { name: 'Database Migration', description: 'Migrate legacy database to new system with zero downtime', ownerId: users[1].id, teamId: teams[0].id, status: 'planning', startDate: new Date('2024-01-15') }
  ]).returning();


  const boards = await db.insert(kanbanBoardsTable).values([
    { name: 'Sprint 23', projectId: projects[0].id },
    { name: 'Sprint 24', projectId: projects[0].id },
    { name: 'Backend Development', projectId: projects[1].id },
    { name: 'Frontend Development', projectId: projects[1].id },
    { name: 'Campaign Planning', projectId: projects[2].id },
    { name: 'Infrastructure', projectId: projects[3].id }
  ]).returning();

  const columns = await db.insert(kanbanColumnsTable).values([
    { name: 'Backlog', boardId: boards[0].id, order: 0, color: '#6b7280' },
    { name: 'To Do', boardId: boards[0].id, order: 1, color: '#f59e0b' },
    { name: 'In Progress', boardId: boards[0].id, order: 2, color: '#3b82f6' },
    { name: 'Review', boardId: boards[0].id, order: 3, color: '#10b981' },
    { name: 'Done', boardId: boards[0].id, order: 4, color: '#22c55e' },

    { name: 'Backlog', boardId: boards[1].id, order: 0, color: '#6b7280' },
    { name: 'To Do', boardId: boards[1].id, order: 1, color: '#f59e0b' },
    { name: 'In Progress', boardId: boards[1].id, order: 2, color: '#3b82f6' },
    { name: 'Testing', boardId: boards[1].id, order: 3, color: '#8b5cf6' },
    { name: 'Done', boardId: boards[1].id, order: 4, color: '#22c55e' },

    { name: 'Ideas', boardId: boards[2].id, order: 0, color: '#6b7280', maxCards: 20 },
    { name: 'Development', boardId: boards[2].id, order: 1, color: '#f59e0b', maxCards: 10 },
    { name: 'Code Review', boardId: boards[2].id, order: 2, color: '#3b82f6', maxCards: 5 },
    { name: 'Done', boardId: boards[2].id, order: 3, color: '#22c55e' },

    { name: 'Planning', boardId: boards[4].id, order: 0, color: '#6b7280' },
    { name: 'Creating', boardId: boards[4].id, order: 1, color: '#f59e0b' },
    { name: 'Review', boardId: boards[4].id, order: 2, color: '#3b82f6' },
    { name: 'Published', boardId: boards[4].id, order: 3, color: '#22c55e' }
  ]).returning();


  const cards = await db.insert(kanbanCardsTable).values([
    { title: 'Implement user authentication', description: 'Add JWT-based authentication system', columnId: columns[2].id, assigneeId: users[0].id, reporterId: users[0].id, priorityId: priorities[2].id, dueDate: new Date('2024-01-15'), order: 0 },
    { title: 'Design new landing page', description: 'Create mockups for new landing page', columnId: columns[3].id, assigneeId: users[2].id, reporterId: users[2].id, priorityId: priorities[1].id, dueDate: new Date('2024-01-20'), order: 1 },
    { title: 'Fix navigation bug', description: 'Navigation menu doesn\'t close on mobile', columnId: columns[4].id, assigneeId: users[4].id, reporterId: users[4].id, priorityId: priorities[2].id, dueDate: new Date('2024-01-10'), order: 0 },
    { title: 'Add payment integration', description: 'Integrate Stripe payment gateway', columnId: columns[6].id, assigneeId: users[1].id, reporterId: users[1].id, priorityId: priorities[3].id, dueDate: new Date('2024-01-25'), order: 0 },
    { title: 'Create API documentation', description: 'Document all REST API endpoints', columnId: columns[0].id, assigneeId: users[3].id, reporterId: users[3].id, priorityId: priorities[1].id, dueDate: new Date('2024-02-01'), order: 1 },
    { title: 'Optimize database queries', description: 'Improve query performance for reports', columnId: columns[7].id, assigneeId: users[1].id, reporterId: users[1].id, priorityId: priorities[2].id, dueDate: new Date('2024-01-18'), order: 1 },
    { title: 'Implement email notifications', description: 'Add email notification system for user actions', columnId: columns[1].id, assigneeId: users[0].id, reporterId: users[0].id, priorityId: priorities[1].id, dueDate: new Date('2024-01-22'), order: 0 },
    { title: 'Update privacy policy', description: 'Update privacy policy page with new regulations', columnId: columns[9].id, assigneeId: users[3].id, reporterId: users[3].id, priorityId: priorities[0].id, dueDate: new Date('2024-01-12'), order: 0 },
    { title: 'Add search functionality', description: 'Implement full-text search for products', columnId: columns[11].id, assigneeId: users[4].id, reporterId: users[4].id, priorityId: priorities[2].id, dueDate: new Date('2024-01-28'), order: 0 },
    { title: 'Create social media campaign', description: 'Design and launch Q3 social media campaign', columnId: columns[13].id, assigneeId: users[3].id, reporterId: users[3].id, priorityId: priorities[3].id, dueDate: new Date('2024-01-30'), order: 0 },
    { title: 'Migrate user data', description: 'Migrate existing user data to new database structure', columnId: columns[15].id, assigneeId: users[1].id, reporterId: users[1].id, priorityId: priorities[3].id, dueDate: new Date('2024-02-05'), order: 0 }
  ]).returning();



  await db.insert(cardsToLabelsTable).values([
    { cardId: cards[0].id, labelId: labels[1].id },
    { cardId: cards[0].id, labelId: labels[6].id },
    { cardId: cards[1].id, labelId: labels[5].id },
    { cardId: cards[1].id, labelId: labels[2].id },
    { cardId: cards[2].id, labelId: labels[0].id },
    { cardId: cards[2].id, labelId: labels[4].id },
    { cardId: cards[3].id, labelId: labels[1].id },
    { cardId: cards[3].id, labelId: labels[6].id },
    { cardId: cards[4].id, labelId: labels[3].id },
    { cardId: cards[5].id, labelId: labels[2].id },
    { cardId: cards[5].id, labelId: labels[6].id },
    { cardId: cards[6].id, labelId: labels[1].id },
    { cardId: cards[7].id, labelId: labels[3].id },
    { cardId: cards[8].id, labelId: labels[1].id },
    { cardId: cards[8].id, labelId: labels[7].id },
    { cardId: cards[9].id, labelId: labels[5].id },
    { cardId: cards[10].id, labelId: labels[6].id }
  ]);

  const attachments = await db.insert(attachmentsTable).values([
    { cardId: cards[1].id, url: 'https://example.com/mockup-landing.png', filename: 'landing-mockup.png', filetype: 'image/png', filesize: 245760, uploadedBy: users[2].id },
    { cardId: cards[4].id, url: 'https://example.com/api-docs.pdf', filename: 'api-documentation.pdf', filetype: 'application/pdf', filesize: 1024000, uploadedBy: users[3].id },
    { cardId: cards[9].id, url: 'https://example.com/campaign-assets.zip', filename: 'campaign-assets.zip', filetype: 'application/zip', filesize: 5120000, uploadedBy: users[3].id }
  ]).returning();




  console.log('✅ Database seeded successfully!');
  console.log(`👥 Users: ${users.length}`);
  console.log(`👥 Teams: ${teams.length}`);
  console.log(`📂 Projects: ${projects.length}`);
  console.log(`📋 Boards: ${boards.length}`);
  console.log(`📊 Columns: ${columns.length}`);
  console.log(`🃏 Cards: ${cards.length}`);
  console.log(`🏷️ Labels: ${labels.length}`);
  console.log(`⚡ Priorities: ${priorities.length}`);
  console.log(`📎 Attachments: ${attachments.length}`);
  console.log(`💬 Comments: 8`);

  await sqlite.close();
}

seed().catch(console.error);
