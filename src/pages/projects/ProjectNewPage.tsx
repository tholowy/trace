import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectForm from '../../components/projects/ProjectForm';

const ProjectNewPage: FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto p-6">
      <ProjectForm 
        onCancel={() => navigate('/projects')}
        onSuccess={(projectId) => navigate(`/projects/${projectId}`)}
      />
    </div>
  );
};

export default ProjectNewPage;