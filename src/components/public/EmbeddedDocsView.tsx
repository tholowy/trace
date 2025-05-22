import type { FC } from 'react';
// import { useParams } from 'react-router-dom';
// import PublicProjectSite from './PublicProjectSite';

const EmbeddedDocsView: FC = () => {
//   const { projectSlug, documentSlug } = useParams<{ projectSlug: string; documentSlug?: string }>();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900" style={{ margin: 0, padding: 0 }}>
      {/* Versión simplificada sin header/footer para embebido */}
      <div className="p-4">
        {/* <PublicProjectSite isEmbedded={true} /> */}
      </div>
    </div>
  );
};

export default EmbeddedDocsView;