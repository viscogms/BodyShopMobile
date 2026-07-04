export const getStatusColor = (status) => {
    switch(status) {
      case 'Inspection': return '#f39c12'; case 'Quote': return '#e67e22'; case 'Approval': return '#3498db';
      case 'Parts': return '#9b59b6'; case 'WIP': return '#e74c3c'; case 'Wheel Alignment': return '#1abc9c';
      case 'Road Test': return '#f1c40f'; case 'Final Check': return '#2ecc71'; case 'Cleaning': return '#00bcd4';
      case 'Ready': return '#27ae60'; case 'Delivered': return '#7f8c8d'; default: return '#16a34a'; 
    }
  };
  
  export const decodePart = (part) => {
    if (!part) return { name: '', received: false };
    if (typeof part === 'object') return { name: part.name || '', received: !!part.received };
    try {
      const parsed = JSON.parse(part);
      if (parsed && typeof parsed === 'object' && parsed.name !== undefined) {
        return { name: String(parsed.name), received: !!parsed.received };
      }
    } catch(e) {}
    return { name: String(part), received: false };
  };
  
  export const encodePart = (name, received) => {
    return JSON.stringify({ name: String(name), received: !!received });
  };
  
export const parseImagesToArray = (imageString) => {
  // ෆොටෝ නැත්නම් හෝ හිස් නම් කෙලින්ම හිස් array එකක් යවයි
  if (!imageString || String(imageString).trim() === '') return [];
  
  // කොමාවෙන් කඩලා, අමතර හිස්තැන් තියෙන ඒවා සම්පූර්ණයෙන්ම අයින් කරයි
  return String(imageString)
    .split(',')
    .filter(img => img && img.trim() !== '');
};
  
  export const getCleanModelText = (rawModel) => rawModel ? (String(rawModel).includes(' [Cust: ') ? String(rawModel).split(' [Cust: ')[0] : String(rawModel)) : 'No Model';
  
  export const getCustomerNameOnly = (rawModel) => rawModel && String(rawModel).includes(' [Cust: ') ? String(rawModel).split(' [Cust: ')[1].replace(']', '') : '';

  // 💡 Cloudinary පින්තූරය කුඩා කිරීම (Thumbnail Optimization)
export const getThumbnailUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    // q_auto (Auto Quality), f_auto (Auto Format), w_300 (Width 300px)
    return url.replace('/upload/', '/upload/q_auto,f_auto,w_300/');
};