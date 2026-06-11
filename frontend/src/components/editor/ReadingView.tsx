import { useNavigate } from 'react-router-dom';
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  value: string;
  spaceId: string;
  placeholder?: string;
}

const TASK_PREFIX = 'task:';
const MENTION_PREFIX = 'mention:';

/** Read-only render of the description, with clickable task refs and mention chips. */
export function ReadingView({ value, spaceId, placeholder }: Props) {
  const navigate = useNavigate();

  if (!value.trim()) {
    return <div className="md-reading-empty">{placeholder}</div>;
  }

  const components: Components = {
    a({ href, children, ...props }) {
      if (href?.startsWith(TASK_PREFIX)) {
        const id = href.slice(TASK_PREFIX.length);
        const to = `/spaces/${spaceId}/tasks/${id}`;
        return (
          <a
            href={to}
            className="md-ref md-ref-task"
            onClick={(e) => {
              e.preventDefault();
              navigate(to);
            }}
          >
            {children}
          </a>
        );
      }
      if (href?.startsWith(MENTION_PREFIX)) {
        return <span className="md-ref md-ref-mention">{children}</span>;
      }
      return (
        <a href={href} target="_blank" rel="noreferrer" {...props}>
          {children}
        </a>
      );
    },
  };

  return (
    <div className="md-reading">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={(url) =>
          url.startsWith(TASK_PREFIX) || url.startsWith(MENTION_PREFIX)
            ? url
            : defaultUrlTransform(url)
        }
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
