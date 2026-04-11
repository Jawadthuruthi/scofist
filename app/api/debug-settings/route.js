import connectToDB from "../../lib/db";
import Settings from "../../models/Settings";

export default async function handler(req, res) {
  try {
    await connectToDB();
    const settings = await Settings.findOne({});
    res.status(200).json({ 
      hasFestivalNameImage: !!settings?.festival?.festivalNameImage,
      festivalNameImage: settings?.festival?.festivalNameImage,
      rawFestival: settings?.festival
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
