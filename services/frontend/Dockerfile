FROM nginx:alpine

# Copy custom HTML
COPY index.html /usr/share/nginx/html/

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
