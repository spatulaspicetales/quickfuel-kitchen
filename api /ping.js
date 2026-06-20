export default function handler(req, res) {
  res.status(200).json({ message: 'pong', timestamp: new Date().toISOString() });
}
