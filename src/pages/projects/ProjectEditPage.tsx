import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectForm from '../../components/projects/ProjectForm';

const ProjectEditPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  if (!id) {
    return <div className="p-4 text-red-500">ID de proyecto no proporcionado</div>;
  }
  
  return (
    <div className="container mx-auto p-6">
      <ProjectForm 
        projectId={id}
        onCancel={() => navigate(`/projects/${id}`)}
        onSuccess={(projectId) => navigate(`/projects/${projectId}`)}
      />
    </div>
  );
};

export default ProjectEditPage;
