import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const LOCAL_DB_PATH = path.join(__dirname, '../../local_db.json');

// Interface structures for DB
export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

export interface IFlowchart {
  id: string;
  userId: string;
  name: string;
  data: any; // Contains shapes, connections, zoom, panOffset
  createdAt: Date;
  updatedAt: Date;
}

// Local JSON Database format
interface ILocalDB {
  users: IUser[];
  flowcharts: IFlowchart[];
}

let useLocalDB = false;

// Check MongoDB connection
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/flowchart-maker';
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000 // Quick timeout if mongo is not running
    });
    console.log('✔ MongoDB connected successfully.');
    useLocalDB = false;
    await seedDefaultFlowchartIfEmpty();
  } catch (err) {
    console.warn('⚠️ MongoDB connection failed. Falling back to local JSON database.');
    useLocalDB = true;
    initializeLocalDB();
    await seedDefaultFlowchartIfEmpty();
  }
}

async function seedDefaultFlowchartIfEmpty() {
  try {
    const list = await db.flowcharts.findByUser('guest');
    if (list.length === 0) {
      console.log('🌱 Seeding default sample flowchart for guest profile...');
      await db.flowcharts.create({
        userId: 'guest',
        name: 'Sample Flowchart',
        data: {
          shapes: [
            {
              id: 'seed_shape_1',
              type: 'circle',
              x: 235,
              y: 50,
              width: 90,
              height: 90,
              fill: '#eff6ff',
              stroke: '#3b82f6',
              strokeWidth: 2,
              strokeDash: 'solid',
              text: 'Start',
              fontFamily: 'Inter',
              fontSize: 14,
              fontBold: true,
              fontItalic: false,
              fontUnderline: false,
              textColor: '#1e3a8a',
              textAlign: 'center'
            },
            {
              id: 'seed_shape_2',
              type: 'diamond',
              x: 230,
              y: 200,
              width: 100,
              height: 100,
              fill: '#fef3c7',
              stroke: '#d97706',
              strokeWidth: 2,
              strokeDash: 'solid',
              text: 'Is it working?',
              fontFamily: 'Inter',
              fontSize: 12,
              fontBold: false,
              fontItalic: false,
              fontUnderline: false,
              textColor: '#78350f',
              textAlign: 'center'
            },
            {
              id: 'seed_shape_3',
              type: 'rectangle',
              x: 415,
              y: 215,
              width: 120,
              height: 70,
              fill: '#fef2f2',
              stroke: '#ef4444',
              strokeWidth: 2,
              strokeDash: 'solid',
              text: 'Fix it!',
              fontFamily: 'Inter',
              fontSize: 14,
              fontBold: false,
              fontItalic: false,
              fontUnderline: false,
              textColor: '#7f1d1d',
              textAlign: 'center'
            },
            {
              id: 'seed_shape_4',
              type: 'rounded-rect',
              x: 220,
              y: 380,
              width: 120,
              height: 70,
              fill: '#f0fdf4',
              stroke: '#10b981',
              strokeWidth: 2,
              strokeDash: 'solid',
              text: 'Celebrate!',
              fontFamily: 'Inter',
              fontSize: 14,
              fontBold: true,
              fontItalic: false,
              fontUnderline: false,
              textColor: '#064e3b',
              textAlign: 'center'
            }
          ],
          connections: [
            {
              id: 'seed_conn_1',
              fromId: 'seed_shape_1',
              fromPort: 'bottom',
              toId: 'seed_shape_2',
              toPort: 'top',
              lineStyle: 'straight',
              stroke: '#64748b',
              strokeWidth: 2,
              strokeDash: 'solid',
              arrowHead: 'single'
            },
            {
              id: 'seed_conn_2',
              fromId: 'seed_shape_2',
              fromPort: 'right',
              toId: 'seed_shape_3',
              toPort: 'left',
              lineStyle: 'orthogonal',
              stroke: '#64748b',
              strokeWidth: 2,
              strokeDash: 'solid',
              arrowHead: 'single',
              label: 'No'
            },
            {
              id: 'seed_conn_3',
              fromId: 'seed_shape_2',
              fromPort: 'bottom',
              toId: 'seed_shape_4',
              toPort: 'top',
              lineStyle: 'orthogonal',
              stroke: '#64748b',
              strokeWidth: 2,
              strokeDash: 'solid',
              arrowHead: 'single',
              label: 'Yes'
            },
            {
              id: 'seed_conn_4',
              fromId: 'seed_shape_3',
              fromPort: 'top',
              toId: 'seed_shape_2',
              toPort: 'top',
              lineStyle: 'curved',
              stroke: '#ef4444',
              strokeWidth: 2,
              strokeDash: 'dashed',
              arrowHead: 'single'
            }
          ],
          zoom: 1.1,
          panOffset: { x: 50, y: 30 }
        }
      });
    }
  } catch (e) {
    console.error('Seed error:', e);
  }
}

// Local JSON file database helper functions
function initializeLocalDB() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultDB: ILocalDB = { users: [], flowcharts: [] };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDB, null, 2), 'utf8');
  }
}

function readLocalDB(): ILocalDB {
  initializeLocalDB();
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { users: [], flowcharts: [] };
  }
}

function writeLocalDB(data: ILocalDB) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// MongoDB Schemas (for Mongoose mode)
const UserSchema = new mongoose.Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const FlowchartSchema = new mongoose.Schema<IFlowchart>({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MongoUserModel = mongoose.model('User', UserSchema);
const MongoFlowchartModel = mongoose.model('Flowchart', FlowchartSchema);

// Unified Database Provider Interface
export const db = {
  users: {
    async create(user: Omit<IUser, 'id' | 'createdAt'>): Promise<IUser> {
      if (!useLocalDB) {
        const mongoUser = new MongoUserModel(user);
        const saved = await mongoUser.save();
        return {
          id: saved._id.toString(),
          email: saved.email,
          passwordHash: saved.passwordHash,
          name: saved.name,
          createdAt: saved.createdAt
        };
      } else {
        const fileData = readLocalDB();
        const newUser: IUser = {
          ...user,
          id: Math.random().toString(36).substring(2, 9),
          createdAt: new Date()
        };
        fileData.users.push(newUser);
        writeLocalDB(fileData);
        return newUser;
      }
    },

    async findByEmail(email: string): Promise<IUser | null> {
      if (!useLocalDB) {
        const user = await MongoUserModel.findOne({ email });
        if (!user) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          passwordHash: user.passwordHash,
          name: user.name,
          createdAt: user.createdAt
        };
      } else {
        const fileData = readLocalDB();
        const user = fileData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        return user || null;
      }
    },

    async findById(id: string): Promise<IUser | null> {
      if (!useLocalDB) {
        if (!mongoose.Types.ObjectId.isValid(id)) return null;
        const user = await MongoUserModel.findById(id);
        if (!user) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          passwordHash: user.passwordHash,
          name: user.name,
          createdAt: user.createdAt
        };
      } else {
        const fileData = readLocalDB();
        const user = fileData.users.find(u => u.id === id);
        return user || null;
      }
    }
  },

  flowcharts: {
    async create(flowchart: Omit<IFlowchart, 'id' | 'createdAt' | 'updatedAt'>): Promise<IFlowchart> {
      if (!useLocalDB) {
        const mongoFlow = new MongoFlowchartModel(flowchart);
        const saved = await mongoFlow.save();
        return {
          id: saved._id.toString(),
          userId: saved.userId,
          name: saved.name,
          data: saved.data,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt
        };
      } else {
        const fileData = readLocalDB();
        const newFlow: IFlowchart = {
          ...flowchart,
          id: Math.random().toString(36).substring(2, 9),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        fileData.flowcharts.push(newFlow);
        writeLocalDB(fileData);
        return newFlow;
      }
    },

    async findById(id: string): Promise<IFlowchart | null> {
      if (!useLocalDB) {
        if (!mongoose.Types.ObjectId.isValid(id)) return null;
        const flowchart = await MongoFlowchartModel.findById(id);
        if (!flowchart) return null;
        return {
          id: flowchart._id.toString(),
          userId: flowchart.userId,
          name: flowchart.name,
          data: flowchart.data,
          createdAt: flowchart.createdAt,
          updatedAt: flowchart.updatedAt
        };
      } else {
        const fileData = readLocalDB();
        const flowchart = fileData.flowcharts.find(f => f.id === id);
        return flowchart || null;
      }
    },

    async findByUser(userId: string): Promise<IFlowchart[]> {
      if (!useLocalDB) {
        const list = await MongoFlowchartModel.find({ userId }).sort({ updatedAt: -1 });
        return list.map((flowchart: any) => ({
          id: flowchart._id.toString(),
          userId: flowchart.userId,
          name: flowchart.name,
          data: flowchart.data,
          createdAt: flowchart.createdAt,
          updatedAt: flowchart.updatedAt
        }));
      } else {
        const fileData = readLocalDB();
        return fileData.flowcharts
          .filter(f => f.userId === userId)
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      }
    },

    async update(id: string, name: string, data: any): Promise<IFlowchart | null> {
      if (!useLocalDB) {
        if (!mongoose.Types.ObjectId.isValid(id)) return null;
        const updated = await MongoFlowchartModel.findByIdAndUpdate(
          id,
          { name, data, updatedAt: new Date() },
          { new: true }
        );
        if (!updated) return null;
        return {
          id: updated._id.toString(),
          userId: updated.userId,
          name: updated.name,
          data: updated.data,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        };
      } else {
        const fileData = readLocalDB();
        const flowchartIndex = fileData.flowcharts.findIndex(f => f.id === id);
        if (flowchartIndex === -1) return null;
        
        const existing = fileData.flowcharts[flowchartIndex];
        const updated: IFlowchart = {
          ...existing,
          name,
          data,
          updatedAt: new Date()
        };
        fileData.flowcharts[flowchartIndex] = updated;
        writeLocalDB(fileData);
        return updated;
      }
    },

    async delete(id: string): Promise<boolean> {
      if (!useLocalDB) {
        if (!mongoose.Types.ObjectId.isValid(id)) return false;
        const result = await MongoFlowchartModel.findByIdAndDelete(id);
        return result !== null;
      } else {
        const fileData = readLocalDB();
        const initialLength = fileData.flowcharts.length;
        fileData.flowcharts = fileData.flowcharts.filter(f => f.id !== id);
        writeLocalDB(fileData);
        return fileData.flowcharts.length < initialLength;
      }
    }
  }
};
