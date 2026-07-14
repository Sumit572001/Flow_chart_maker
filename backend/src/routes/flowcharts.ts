import { Router, Request, Response } from 'express';
import { db } from '../config/db';

const router = Router();

const DEFAULT_USER_ID = 'guest';

// GET /api/flowcharts - List all flowcharts (since single-user mode)
router.get('/', async (req: Request, res: Response) => {
  try {
    const list = await db.flowcharts.findByUser(DEFAULT_USER_ID);
    return res.json(list);
  } catch (err: any) {
    console.error('Fetch flowcharts error:', err);
    return res.status(500).json({ message: 'Failed to retrieve flowcharts' });
  }
});

// GET /api/flowcharts/:id - Get specific flowchart details
router.get('/:id', async (req: Request, res: Response) => {
  const flowId = req.params.id;

  try {
    const flowchart = await db.flowcharts.findById(flowId);
    if (!flowchart) {
      return res.status(404).json({ message: 'Flowchart not found' });
    }

    return res.json(flowchart);
  } catch (err: any) {
    console.error('Fetch flowchart details error:', err);
    return res.status(500).json({ message: 'Failed to retrieve flowchart details' });
  }
});

// POST /api/flowcharts - Create a new flowchart
router.post('/', async (req: Request, res: Response) => {
  const { name, data } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Flowchart name is required' });
  }

  try {
    const newFlow = await db.flowcharts.create({
      userId: DEFAULT_USER_ID,
      name,
      data: data || { shapes: [], connections: [], zoom: 1, panOffset: { x: 0, y: 0 } }
    });
    return res.status(201).json(newFlow);
  } catch (err: any) {
    console.error('Create flowchart error:', err);
    return res.status(500).json({ message: 'Failed to create flowchart' });
  }
});

// PUT /api/flowcharts/:id - Update/save flowchart
router.put('/:id', async (req: Request, res: Response) => {
  const flowId = req.params.id;
  const { name, data } = req.body;

  if (!name || !data) {
    return res.status(400).json({ message: 'Name and canvas data are required to save' });
  }

  try {
    const existing = await db.flowcharts.findById(flowId);
    if (!existing) {
      return res.status(404).json({ message: 'Flowchart not found' });
    }

    const updated = await db.flowcharts.update(flowId, name, data);
    return res.json(updated);
  } catch (err: any) {
    console.error('Update flowchart error:', err);
    return res.status(500).json({ message: 'Failed to update flowchart' });
  }
});

// DELETE /api/flowcharts/:id - Delete flowchart
router.delete('/:id', async (req: Request, res: Response) => {
  const flowId = req.params.id;

  try {
    const existing = await db.flowcharts.findById(flowId);
    if (!existing) {
      return res.status(404).json({ message: 'Flowchart not found' });
    }

    const success = await db.flowcharts.delete(flowId);
    if (success) {
      return res.json({ message: 'Flowchart deleted successfully' });
    } else {
      return res.status(500).json({ message: 'Failed to delete flowchart' });
    }
  } catch (err: any) {
    console.error('Delete flowchart error:', err);
    return res.status(500).json({ message: 'Failed to delete flowchart' });
  }
});

export default router;
