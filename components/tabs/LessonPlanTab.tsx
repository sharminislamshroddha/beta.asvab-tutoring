import React from 'react';

export interface Session {
  sessionTitle: string;
  lessons: string[];
}

const LessonPlanTab: React.FC<{ sessions?: Session[] }> = ({ sessions }) => {
  // const dummySessions: Session[] = [
  //   {
  //     sessionTitle: "Session 1",
  //     lessons: ["Arithmetic Reasoning Lesson 1", "Reading Comprehension Lesson 1", "Word Knowledge Lesson 1"]
  //   },
  //   {
  //     sessionTitle: "Session 2",
  //     lessons: ["Arithmetic Reasoning Lesson 2", "Reading Comprehension Lesson 2", "Word Knowledge 2", "Verbal Analogy 1"]
  //   },
  //   {
  //     sessionTitle: "Session 3",
  //     lessons: ["Final Practice Test 1-5 review", "Table Reading", "Block Counting Lesson 1 & 2", "Reading Comprehension"]
  //   }
  // ];

  const displaySessions = sessions && sessions.length > 0 ? sessions : null;
  const getIconForTopic = (topic: string) => {
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('math') || lowerTopic.includes('arithmetic')) return <i className="bi bi-calculator fs-5" style={{ color: '#e58a34' }}></i>;
    if (lowerTopic.includes('aviation') || lowerTopic.includes('plane')) return <i className="bi bi-airplane fs-5" style={{ color: '#e58a34' }}></i>;
    if (lowerTopic.includes('comprehension') || lowerTopic.includes('reading') || lowerTopic.includes('word') || lowerTopic.includes('verbal') || lowerTopic.includes('text')) return <i className="bi bi-file-text fs-5" style={{ color: '#e58a34' }}></i>;
    if (lowerTopic.includes('table') || lowerTopic.includes('block')) return <i className="bi bi-grid fs-5" style={{ color: '#e58a34' }}></i>;
    return <i className="bi bi-journal-text fs-5" style={{ color: '#e58a34' }}></i>;
  };

  return (
    <div className="sessions-roadmap pt-2 pb-4">
      <div className="position-relative">
        {/* Vertical Timeline Line */}
        <div className="position-absolute d-none d-md-block" style={{ left: '7px', top: '30px', bottom: '30px', width: '2px', backgroundColor: '#e58a34', opacity: 0.3 }}></div>

        {displaySessions ? displaySessions.map((s, idx) => (
          <div key={idx} className="position-relative mb-4 ps-0 ps-md-4">
            {/* Timeline Dot */}
            <div className="position-absolute rounded-circle bg-white d-none d-md-block" style={{
              width: '16px', height: '16px', left: '0px', top: '22px',
              border: '3px solid #e58a34', zIndex: 2
            }}></div>

            <div className="card shadow-sm" style={{ border: '1px solid #cfd4d8', borderRadius: '8px', marginLeft: "5px" }}>
              <div className="card-header bg-white" style={{ borderBottom: '1px solid #cfd4d8', padding: '16px 24px' }}>
                <h5 className="mb-0 fw-bold" style={{ color: '#e58a34' }}>{s.sessionTitle}</h5>
              </div>
              <div className="card-body" style={{ padding: '16px 24px' }}>
                <ul className="list-unstyled mb-0 w-100">
                  {s.lessons.map((lesson, lIdx) => (
                    <li key={lIdx} className={`d-flex align-items-center ${lIdx !== s.lessons.length - 1 ? 'mb-3' : 'mb-0'} pb-1`}>
                      <div className="d-flex align-items-center justify-content-center bg-light rounded-circle me-3" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                        {getIconForTopic(lesson)}
                      </div>
                      <span className="fw-medium" style={{ color: '#495057', fontSize: '1rem' }}>{lesson}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )) :
          <div className="text-center py-5">
            <p className="text-muted">No sessions available for this course.</p>
          </div>
        }
      </div>
    </div>
  );
};

export default LessonPlanTab;
